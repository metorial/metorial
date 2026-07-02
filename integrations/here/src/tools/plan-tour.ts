import { SlateTool } from 'slates';
import { z } from 'zod';
import { HereClient } from '../lib/client';
import { spec } from '../spec';

let locationSchema = z.object({
  lat: z.number().describe('Latitude'),
  lng: z.number().describe('Longitude')
});

let taskPlaceSchema = z.object({
  location: locationSchema.describe('Task location coordinates'),
  duration: z.number().describe('Service duration at this stop in seconds'),
  times: z
    .array(z.array(z.string()))
    .optional()
    .describe('Time windows as [["start_iso","end_iso"]] pairs')
});

let jobSchema = z.object({
  jobId: z.string().describe('Unique job identifier'),
  deliveries: z
    .array(
      z.object({
        places: z.array(taskPlaceSchema),
        demand: z.array(z.number()).optional().describe('Capacity demand for this delivery')
      })
    )
    .optional()
    .describe('Delivery tasks'),
  pickups: z
    .array(
      z.object({
        places: z.array(taskPlaceSchema),
        demand: z.array(z.number()).optional().describe('Capacity demand for this pickup')
      })
    )
    .optional()
    .describe('Pickup tasks'),
  priority: z.number().optional().describe('Job priority (higher = more important)'),
  skills: z.array(z.string()).optional().describe('Required vehicle skills for this job')
});

let vehicleTypeSchema = z.object({
  vehicleTypeId: z.string().describe('Unique vehicle type identifier'),
  profile: z.string().describe('Routing profile name (e.g. "normal_car")'),
  costs: z
    .object({
      distance: z.number().optional().describe('Cost per meter'),
      time: z.number().optional().describe('Cost per second'),
      fixed: z.number().optional().describe('Fixed cost per vehicle')
    })
    .optional()
    .describe('Cost factors'),
  shifts: z
    .array(
      z.object({
        start: z.object({
          time: z.string().describe('Shift start time (ISO 8601)'),
          location: locationSchema
        }),
        end: z
          .object({
            time: z.string().describe('Shift end time (ISO 8601)'),
            location: locationSchema
          })
          .optional()
          .describe('Shift end (omit for open-ended routes)')
      })
    )
    .describe('Vehicle shift schedules'),
  capacity: z.array(z.number()).optional().describe('Vehicle capacity dimensions'),
  amount: z.number().optional().describe('Number of vehicles of this type'),
  skills: z.array(z.string()).optional().describe('Skills this vehicle type provides'),
  limits: z
    .object({
      maxDistance: z.number().optional().describe('Maximum route distance in meters'),
      shiftTime: z.number().optional().describe('Maximum shift time in seconds')
    })
    .optional()
    .describe('Vehicle limits')
});

let profileSchema = z.object({
  name: z.string().describe('Profile name matching vehicle type profile'),
  type: z.enum(['car', 'truck']).describe('Vehicle routing type'),
  departureTime: z.string().optional().describe('Departure time (ISO 8601)')
});

export let planTour = SlateTool.create(spec, {
  name: 'Plan Tour',
  key: 'plan_tour',
  description: `Optimize routes for multiple vehicles visiting a set of locations. Solves the Vehicle Routing Problem (VRP) with constraints like vehicle capacity, time windows, and shift limits.
Returns optimized stop sequences for each vehicle, including arrival/departure times and route distances.`,
  instructions: [
    'Each job must have at least one delivery or pickup task with a location and service duration.',
    'Vehicle types define fleet composition - use "amount" to specify how many vehicles of each type.',
    'Profiles link vehicle types to routing modes (car/truck).',
    'Time windows in tasks control when stops can be visited.',
    'Increase maxSolverTime for better optimization of large problems.'
  ],
  constraints: ['Complex problems with many jobs and vehicles may take longer to solve.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobs: z.array(jobSchema).describe('Jobs (stops) to visit'),
      vehicleTypes: z.array(vehicleTypeSchema).describe('Vehicle types in the fleet'),
      profiles: z.array(profileSchema).describe('Routing profiles for vehicles'),
      maxSolverTime: z
        .number()
        .optional()
        .describe('Maximum solver time in seconds (default 2)'),
      stagnationTime: z
        .number()
        .optional()
        .describe('Stop if no improvement after this many seconds')
    })
  )
  .output(
    z.object({
      tours: z
        .array(
          z.object({
            vehicleTypeId: z.string().optional().describe('Vehicle type used'),
            vehicleId: z.string().optional().describe('Specific vehicle identifier'),
            stops: z
              .array(
                z.object({
                  location: locationSchema.optional(),
                  time: z
                    .object({
                      arrival: z.string().optional(),
                      departure: z.string().optional()
                    })
                    .optional(),
                  activities: z
                    .array(
                      z.object({
                        type: z.string().optional(),
                        jobId: z.string().optional()
                      })
                    )
                    .optional(),
                  distance: z.number().optional().describe('Cumulative distance in meters')
                })
              )
              .optional()
          })
        )
        .optional()
        .describe('Optimized tours per vehicle'),
      unassigned: z
        .array(
          z.object({
            jobId: z.string().optional(),
            reasons: z.array(z.any()).optional()
          })
        )
        .optional()
        .describe('Jobs that could not be assigned to any vehicle'),
      statistics: z
        .object({
          cost: z.number().optional(),
          distance: z.number().optional(),
          duration: z.number().optional(),
          times: z.any().optional()
        })
        .optional()
        .describe('Overall solution statistics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HereClient({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let body: Record<string, any> = {
      plan: {
        jobs: ctx.input.jobs.map(job => ({
          id: job.jobId,
          tasks: {
            ...(job.deliveries ? { deliveries: job.deliveries } : {}),
            ...(job.pickups ? { pickups: job.pickups } : {})
          },
          priority: job.priority,
          skills: job.skills
        }))
      },
      fleet: {
        types: ctx.input.vehicleTypes.map(vt => ({
          id: vt.vehicleTypeId,
          profile: vt.profile,
          costs: vt.costs,
          shifts: vt.shifts,
          capacity: vt.capacity,
          amount: vt.amount || 1,
          skills: vt.skills,
          limits: vt.limits
        })),
        profiles: ctx.input.profiles
      },
      configuration: {
        termination: {
          maxTime: ctx.input.maxSolverTime || 2,
          ...(ctx.input.stagnationTime ? { stagnationTime: ctx.input.stagnationTime } : {})
        }
      }
    };

    let response = await client.planTour(body);

    let tours = response.tours?.map((tour: any) => ({
      vehicleTypeId: tour.typeId,
      vehicleId: tour.vehicleId,
      stops: tour.stops?.map((stop: any) => ({
        location: stop.location,
        time: stop.time,
        activities: stop.activities,
        distance: stop.distance
      }))
    }));

    let unassigned = response.unassigned?.map((u: any) => ({
      jobId: u.jobId,
      reasons: u.reasons
    }));

    let tourCount = tours?.length || 0;
    let unassignedCount = unassigned?.length || 0;
    let totalStops =
      tours?.reduce((sum: number, t: any) => sum + (t.stops?.length || 0), 0) || 0;

    return {
      output: {
        tours,
        unassigned,
        statistics: response.statistic
      },
      message: `Planned **${tourCount}** tour(s) covering **${totalStops}** stops.${unassignedCount > 0 ? ` **${unassignedCount}** job(s) could not be assigned.` : ''}`
    };
  })
  .build();
