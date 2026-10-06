import { z } from 'zod';

// Explicit public response fields from https://docs.reply.io/api-reference/bundled.yaml.
// Object schemas strip unrecognized fields rather than returning transport or credential data.
export const contactSchema = z
  .object({
    id: z.number().finite().int().safe().optional(),
    email: z.string().optional(),
    domain: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    title: z.string().optional(),
    company: z.string().optional(),
    companySize: z.string().optional(),
    industry: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    timeZoneId: z.string().optional(),
    linkedInUrl: z.string().optional(),
    linkedInSalesNavigatorUrl: z.string().optional(),
    linkedInRecruiterUrl: z.string().optional(),
    phoneStatus: z.string().optional(),
    notes: z.string().optional(),
    ownerUserId: z.number().finite().int().safe().optional(),
    accountId: z.number().finite().int().safe().nullable().optional(),
    isOptedOut: z.boolean().optional(),
    callStatus: z.string().optional(),
    meetingStatus: z.string().optional(),
    addingDate: z.string().nullable().optional(),
    createdAt: z.string().nullable().optional(),
    lastModifiedAt: z.string().nullable().optional(),
    customFields: z
      .array(
        z.object({
          key: z.string().optional(),
          value: z.string().nullable().optional(),
          enrichmentStatus: z.string().nullable().optional()
        })
      )
      .optional()
  })
  .extend({ id: z.number().int().positive().safe() });
export const sequenceSchema = z
  .object({
    id: z.number().finite().int().safe().optional(),
    ownerUserId: z.number().finite().int().safe().optional(),
    name: z.string().optional(),
    created: z.string().optional(),
    status: z.string().optional(),
    isArchived: z.boolean().optional(),
    health: z.string().optional(),
    scheduleId: z.number().finite().int().safe().optional(),
    emailAccounts: z
      .array(
        z.object({
          id: z.number().finite().int().safe().optional(),
          email: z.string().optional()
        })
      )
      .optional(),
    linkedInAccounts: z
      .array(
        z.object({
          id: z.number().finite().int().safe().optional(),
          name: z.string().optional(),
          profileUrl: z.string().nullable().optional(),
          status: z.string().optional()
        })
      )
      .optional(),
    settings: z
      .object({
        emailsCountPerDay: z.number().finite().int().safe().optional(),
        daysToFinishProspect: z.number().finite().int().safe().optional(),
        emailSendingDelaySeconds: z.number().finite().int().safe().optional(),
        dailyThrottling: z.number().finite().int().safe().optional(),
        useDailyThrottling: z.boolean().optional(),
        disableOpensTracking: z.boolean().optional(),
        repliesHandlingType: z.string().optional(),
        enableLinksTracking: z.boolean().optional(),
        isSendingPlainTextEnabled: z.boolean().optional(),
        isListUnsubscribeHeaderEnabled: z.boolean().optional(),
        isSameDomainSendingLimitEnabled: z.boolean().optional(),
        numberOfSameDomainSendingLimit: z.number().finite().int().safe().nullable().optional(),
        matchProspectToEmailAccountProvider: z.boolean().optional(),
        callIsAutomatic: z.boolean().optional(),
        taskIsAutomatic: z.boolean().optional(),
        generatedTaskOwner: z.string().nullable().optional()
      })
      .optional(),
    steps: z
      .array(
        z.object({
          id: z.number().finite().int().safe().nullable().optional(),
          parentId: z.number().finite().int().safe().nullable().optional(),
          ifConditionPositive: z.boolean().nullable().optional(),
          type: z.string().optional(),
          delayInMinutes: z.number().finite().int().safe().optional(),
          executionMode: z.string().optional(),
          variants: z
            .array(
              z.object({
                id: z.number().finite().int().safe().optional(),
                subject: z.string().nullable().optional(),
                message: z.string().nullable().optional(),
                isEnabled: z.boolean().optional(),
                hasAttachments: z.boolean().optional()
              })
            )
            .optional(),
          actionType: z.string().optional(),
          description: z.string().optional(),
          numberOfSkills: z.number().finite().int().safe().optional(),
          audioFile: z.string().optional(),
          message: z.string().nullable().optional(),
          speed: z.number().finite().nullable().optional(),
          backgroundNoiseId: z.number().finite().int().safe().nullable().optional(),
          aiPromptText: z.string().optional(),
          skipIfNoPostsInDays: z.number().finite().int().safe().nullable().optional(),
          skipTopics: z.array(z.string()).optional(),
          name: z.string().optional(),
          action: z.string().optional(),
          waitInMinutes: z.number().finite().int().safe().optional(),
          conditions: z
            .array(
              z.object({
                property: z.string().optional(),
                rules: z
                  .array(
                    z.object({
                      operator: z.string().optional(),
                      value: z.string().nullable().optional()
                    })
                  )
                  .optional()
              })
            )
            .optional()
        })
      )
      .optional()
  })
  .extend({ id: z.number().int().positive().safe() });
export const stepSchema = z.object({
  id: z.number().finite().int().safe().nullable().optional(),
  parentId: z.number().finite().int().safe().nullable().optional(),
  ifConditionPositive: z.boolean().nullable().optional(),
  type: z.string().optional(),
  delayInMinutes: z.number().finite().int().safe().optional(),
  executionMode: z.string().optional(),
  variants: z
    .array(
      z.object({
        id: z.number().finite().int().safe().optional(),
        subject: z.string().nullable().optional(),
        message: z.string().nullable().optional(),
        isEnabled: z.boolean().optional(),
        hasAttachments: z.boolean().optional()
      })
    )
    .optional(),
  actionType: z.string().optional(),
  description: z.string().optional(),
  numberOfSkills: z.number().finite().int().safe().optional(),
  audioFile: z.string().optional(),
  message: z.string().nullable().optional(),
  speed: z.number().finite().nullable().optional(),
  backgroundNoiseId: z.number().finite().int().safe().nullable().optional(),
  aiPromptText: z.string().optional(),
  skipIfNoPostsInDays: z.number().finite().int().safe().nullable().optional(),
  skipTopics: z.array(z.string()).optional(),
  name: z.string().optional(),
  action: z.string().optional(),
  waitInMinutes: z.number().finite().int().safe().optional(),
  conditions: z
    .array(
      z.object({
        property: z.string().optional(),
        rules: z
          .array(
            z.object({
              operator: z.string().optional(),
              value: z.string().nullable().optional()
            })
          )
          .optional()
      })
    )
    .optional()
});
export const membershipSchema = z.object({
  contactId: z.number().finite().int().safe().optional(),
  email: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  title: z.string().optional(),
  addedAt: z.string().optional(),
  currentStep: z
    .object({
      stepId: z.number().finite().int().safe().nullable().optional(),
      displayStepNumber: z.string().optional(),
      stepNumber: z.number().finite().int().safe().optional()
    })
    .optional(),
  lastStepCompletedAt: z.string().nullable().optional(),
  status: z
    .object({
      status: z.string().optional(),
      replied: z.boolean().optional(),
      delivered: z.boolean().optional(),
      bounced: z.boolean().optional(),
      opened: z.boolean().optional(),
      clicked: z.boolean().optional()
    })
    .optional()
});
export const emailAccountSchema = z
  .object({
    id: z.number().finite().int().safe().optional(),
    ownerUserId: z.number().finite().int().safe().optional(),
    email: z.string().optional(),
    senderName: z.string().optional(),
    emailAccountType: z.string().optional(),
    isDefault: z.boolean().optional(),
    dailyLimit: z.number().finite().int().safe().optional(),
    connectionStatus: z.string().optional(),
    tags: z.array(z.string()).optional()
  })
  .extend({ id: z.number().int().positive().safe() });
export const templateSchema = z
  .object({
    id: z.number().finite().int().safe().optional(),
    name: z.string().optional(),
    subject: z.string().nullable().optional(),
    body: z.string().optional(),
    folderId: z.number().finite().int().safe().nullable().optional(),
    folderType: z.string().nullable().optional(),
    attachments: z
      .array(
        z.object({
          id: z.number().finite().int().safe().optional(),
          fileName: z.string().optional(),
          size: z.number().finite().int().safe().optional()
        })
      )
      .optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
  })
  .extend({ id: z.number().int().positive().safe() });
export const contactListSchema = z
  .object({
    id: z.number().finite().int().safe().optional(),
    name: z.string().optional(),
    isShared: z.boolean().optional()
  })
  .extend({ id: z.number().int().positive().safe() });
export const taskSchema = z
  .object({
    id: z.number().finite().int().safe().optional(),
    contactId: z.number().finite().int().safe().nullable().optional(),
    taskType: z.string().optional(),
    status: z.string().optional(),
    linkedInTaskType: z.string().nullable().optional(),
    sequenceId: z.number().finite().int().safe().nullable().optional(),
    sequenceStepId: z.number().finite().int().safe().nullable().optional(),
    sequenceStepDisplayName: z.string().nullable().optional(),
    assignedUserId: z.number().finite().int().safe().optional(),
    creationSource: z.string().optional(),
    createdAt: z.string().optional(),
    startAt: z.string().optional(),
    dueTo: z.string().optional(),
    finishedAt: z.string().nullable().optional(),
    isFailed: z.boolean().optional(),
    isScheduled: z.boolean().optional(),
    template: z
      .object({
        body: z.string().optional(),
        subject: z.string().nullable().optional(),
        attachmentIdList: z.array(z.number().finite().int().safe()).nullable().optional()
      })
      .optional(),
    content: z
      .object({ body: z.string().optional(), subject: z.string().nullable().optional() })
      .nullable()
      .optional(),
    deliveryInfo: z
      .object({
        email: z.string().nullable().optional(),
        phoneNumber: z.string().nullable().optional(),
        linkedInUrl: z.string().nullable().optional()
      })
      .nullable()
      .optional()
  })
  .extend({ id: z.number().int().positive().safe() });
export const taskListSchema = z
  .object({
    id: z.number().finite().int().safe().optional(),
    taskType: z.string().optional(),
    status: z.string().optional(),
    linkedInTaskType: z.string().nullable().optional(),
    assignedUserId: z.number().finite().int().safe().optional(),
    contact: z
      .object({
        id: z.number().finite().int().safe().optional(),
        fullName: z.string().nullable().optional()
      })
      .nullable()
      .optional(),
    startAt: z.string().optional(),
    dueTo: z.string().optional(),
    finishedAt: z.string().nullable().optional(),
    isScheduled: z.boolean().optional(),
    sequenceId: z.number().finite().int().safe().nullable().optional(),
    sequenceStepId: z.number().finite().int().safe().nullable().optional()
  })
  .extend({ id: z.number().int().positive().safe() });
export const scheduleSchema = z
  .object({
    id: z.number().finite().int().safe().optional(),
    name: z.string().optional(),
    timezoneId: z.string().optional(),
    excludeHolidays: z.boolean().optional(),
    useProspectTimezone: z.boolean().optional(),
    useFollowUpSchedule: z.boolean().optional(),
    mainTimings: z
      .array(
        z.object({
          weekDay: z.string().optional(),
          isActive: z.boolean().optional(),
          timeRanges: z
            .array(
              z.object({
                fromTime: z
                  .object({
                    hour: z.number().finite().int().safe().optional(),
                    minute: z.number().finite().int().safe().optional()
                  })
                  .optional(),
                toTime: z
                  .object({
                    hour: z.number().finite().int().safe().optional(),
                    minute: z.number().finite().int().safe().optional()
                  })
                  .optional()
              })
            )
            .optional()
        })
      )
      .optional(),
    followUpTimings: z
      .array(
        z.object({
          weekDay: z.string().optional(),
          isActive: z.boolean().optional(),
          timeRanges: z
            .array(
              z.object({
                fromTime: z
                  .object({
                    hour: z.number().finite().int().safe().optional(),
                    minute: z.number().finite().int().safe().optional()
                  })
                  .optional(),
                toTime: z
                  .object({
                    hour: z.number().finite().int().safe().optional(),
                    minute: z.number().finite().int().safe().optional()
                  })
                  .optional()
              })
            )
            .optional()
        })
      )
      .optional(),
    isDefault: z.boolean().optional(),
    status: z.string().optional()
  })
  .extend({ id: z.number().int().positive().safe() });
export const statsSchema = z.object({
  emailOverview: z
    .object({
      contacted: z.number().finite().int().safe().optional(),
      delivered: z.number().finite().int().safe().optional(),
      opened: z.number().finite().int().safe().optional(),
      replied: z.number().finite().int().safe().optional(),
      interested: z.number().finite().int().safe().optional(),
      notReached: z.number().finite().int().safe().optional(),
      optedOut: z.number().finite().int().safe().optional(),
      outOfOffice: z.number().finite().int().safe().optional(),
      bounced: z.number().finite().int().safe().optional(),
      autoReplied: z.number().finite().int().safe().optional(),
      meetingsBooked: z.number().finite().int().safe().optional(),
      deliveredPercentage: z.number().finite().optional(),
      openedPercentage: z.number().finite().optional(),
      repliedPercentage: z.number().finite().optional(),
      interestedPercentage: z.number().finite().optional(),
      notReachedPercentage: z.number().finite().optional(),
      optedOutPercentage: z.number().finite().optional(),
      outOfOfficePercentage: z.number().finite().optional(),
      bouncedPercentage: z.number().finite().optional(),
      autoRepliedPercentage: z.number().finite().optional(),
      meetingsBookedPercentage: z.number().finite().optional()
    })
    .optional(),
  linkedInOverview: z
    .object({
      connectionsSent: z.number().finite().int().safe().optional(),
      connectionsAccepted: z.number().finite().int().safe().optional(),
      connectionsAcceptedPercentage: z.number().finite().optional(),
      messagesSent: z.number().finite().int().safe().optional(),
      replied: z.number().finite().int().safe().optional(),
      repliedPercentage: z.number().finite().optional(),
      inMailsSent: z.number().finite().int().safe().optional(),
      inMailsReplied: z.number().finite().int().safe().optional(),
      inMailsRepliedPercentage: z.number().finite().optional(),
      connectionNotesSent: z.number().finite().int().safe().optional(),
      connectionNotesReplied: z.number().finite().int().safe().optional(),
      connectionNotesRepliedPercentage: z.number().finite().optional(),
      profileViews: z.number().finite().int().safe().optional(),
      likes: z.number().finite().int().safe().optional(),
      follows: z.number().finite().int().safe().optional(),
      endorses: z.number().finite().int().safe().optional(),
      regularMessagesSent: z.number().finite().int().safe().optional(),
      regularMessagesReplied: z.number().finite().int().safe().optional(),
      regularMessagesRepliedPercentage: z.number().finite().optional()
    })
    .optional()
});
export const emailStatsSchema = z.object({
  overview: z
    .object({
      contacted: z.number().finite().int().safe().optional(),
      delivered: z.number().finite().int().safe().optional(),
      opened: z.number().finite().int().safe().optional(),
      replied: z.number().finite().int().safe().optional(),
      interested: z.number().finite().int().safe().optional(),
      notReached: z.number().finite().int().safe().optional(),
      optedOut: z.number().finite().int().safe().optional(),
      outOfOffice: z.number().finite().int().safe().optional(),
      bounced: z.number().finite().int().safe().optional(),
      autoReplied: z.number().finite().int().safe().optional(),
      meetingsBooked: z.number().finite().int().safe().optional(),
      deliveredPercentage: z.number().finite().optional(),
      openedPercentage: z.number().finite().optional(),
      repliedPercentage: z.number().finite().optional(),
      interestedPercentage: z.number().finite().optional(),
      notReachedPercentage: z.number().finite().optional(),
      optedOutPercentage: z.number().finite().optional(),
      outOfOfficePercentage: z.number().finite().optional(),
      bouncedPercentage: z.number().finite().optional(),
      autoRepliedPercentage: z.number().finite().optional(),
      meetingsBookedPercentage: z.number().finite().optional()
    })
    .optional(),
  steps: z
    .array(
      z.object({
        stepId: z.number().finite().int().safe().optional(),
        stepNumber: z.number().finite().int().safe().optional(),
        displayName: z.string().optional(),
        isArchived: z.boolean().optional(),
        variants: z
          .array(
            z.object({
              id: z.number().finite().int().safe().optional(),
              isEnabled: z.boolean().optional(),
              hasAttachments: z.boolean().optional(),
              generatedByAi: z.boolean().optional(),
              delivered: z.number().finite().int().safe().optional(),
              deliveredPercentage: z.number().finite().optional(),
              opened: z.number().finite().int().safe().optional(),
              openedPercentage: z.number().finite().optional(),
              replied: z.number().finite().int().safe().optional(),
              repliedPercentage: z.number().finite().optional(),
              interested: z.number().finite().int().safe().optional(),
              interestedPercentage: z.number().finite().optional(),
              notReached: z.number().finite().int().safe().optional(),
              notReachedPercentage: z.number().finite().optional(),
              optedOut: z.number().finite().int().safe().optional(),
              optedOutPercentage: z.number().finite().optional(),
              linksClicked: z.number().finite().int().safe().optional(),
              clickThroughRate: z.number().finite().optional(),
              meetingsBooked: z.number().finite().int().safe().optional(),
              meetingsBookedPercentage: z.number().finite().optional()
            })
          )
          .optional(),
        delivered: z.number().finite().int().safe().optional(),
        deliveredPercentage: z.number().finite().optional(),
        opened: z.number().finite().int().safe().optional(),
        openedPercentage: z.number().finite().optional(),
        replied: z.number().finite().int().safe().optional(),
        repliedPercentage: z.number().finite().optional(),
        interested: z.number().finite().int().safe().optional(),
        interestedPercentage: z.number().finite().optional(),
        notReached: z.number().finite().int().safe().optional(),
        notReachedPercentage: z.number().finite().optional(),
        optedOut: z.number().finite().int().safe().optional(),
        optedOutPercentage: z.number().finite().optional(),
        linksClicked: z.number().finite().int().safe().optional(),
        clickThroughRate: z.number().finite().optional(),
        meetingsBooked: z.number().finite().int().safe().optional(),
        meetingsBookedPercentage: z.number().finite().optional()
      })
    )
    .optional()
});
export const allStatsSchema = z.object({
  sequenceId: z.number().finite().int().safe().optional(),
  name: z.string().optional(),
  status: z.string().optional(),
  emailOverview: z
    .object({
      contacted: z.number().finite().int().safe().optional(),
      delivered: z.number().finite().int().safe().optional(),
      opened: z.number().finite().int().safe().optional(),
      replied: z.number().finite().int().safe().optional(),
      interested: z.number().finite().int().safe().optional(),
      notReached: z.number().finite().int().safe().optional(),
      optedOut: z.number().finite().int().safe().optional(),
      outOfOffice: z.number().finite().int().safe().optional(),
      bounced: z.number().finite().int().safe().optional(),
      autoReplied: z.number().finite().int().safe().optional(),
      meetingsBooked: z.number().finite().int().safe().optional(),
      deliveredPercentage: z.number().finite().optional(),
      openedPercentage: z.number().finite().optional(),
      repliedPercentage: z.number().finite().optional(),
      interestedPercentage: z.number().finite().optional(),
      notReachedPercentage: z.number().finite().optional(),
      optedOutPercentage: z.number().finite().optional(),
      outOfOfficePercentage: z.number().finite().optional(),
      bouncedPercentage: z.number().finite().optional(),
      autoRepliedPercentage: z.number().finite().optional(),
      meetingsBookedPercentage: z.number().finite().optional()
    })
    .optional(),
  linkedInOverview: z
    .object({
      connectionsSent: z.number().finite().int().safe().optional(),
      connectionsAccepted: z.number().finite().int().safe().optional(),
      connectionsAcceptedPercentage: z.number().finite().optional(),
      messagesSent: z.number().finite().int().safe().optional(),
      replied: z.number().finite().int().safe().optional(),
      repliedPercentage: z.number().finite().optional(),
      inMailsSent: z.number().finite().int().safe().optional(),
      inMailsReplied: z.number().finite().int().safe().optional(),
      inMailsRepliedPercentage: z.number().finite().optional(),
      connectionNotesSent: z.number().finite().int().safe().optional(),
      connectionNotesReplied: z.number().finite().int().safe().optional(),
      connectionNotesRepliedPercentage: z.number().finite().optional(),
      profileViews: z.number().finite().int().safe().optional(),
      likes: z.number().finite().int().safe().optional(),
      follows: z.number().finite().int().safe().optional(),
      endorses: z.number().finite().int().safe().optional(),
      regularMessagesSent: z.number().finite().int().safe().optional(),
      regularMessagesReplied: z.number().finite().int().safe().optional(),
      regularMessagesRepliedPercentage: z.number().finite().optional()
    })
    .optional()
});
export const teamReportSchema = z.object({
  meetings: z.number().finite().int().safe().optional(),
  contacted: z.number().finite().int().safe().optional(),
  meetingConversionPercentage: z.number().finite().optional(),
  touchesPerContact: z.number().finite().optional(),
  autoTouchesPerContact: z.number().finite().optional(),
  manualTouchesPerContact: z.number().finite().optional(),
  averageResponseTimePerContact: z.number().finite().int().safe().optional(),
  memberStatistics: z
    .array(
      z.object({
        userId: z.number().finite().int().safe().optional(),
        meetings: z.number().finite().int().safe().optional(),
        contacted: z.number().finite().int().safe().optional(),
        conversionPercentage: z.number().finite().optional(),
        touches: z.number().finite().optional(),
        autoTouches: z.number().finite().optional(),
        manualTouches: z.number().finite().optional(),
        responseTime: z.number().finite().int().safe().optional(),
        responseRate: z.string().optional()
      })
    )
    .optional()
});
