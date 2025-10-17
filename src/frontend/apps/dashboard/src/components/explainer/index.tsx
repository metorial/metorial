import { Button } from '@metorial/ui';
import { RiCloseLine } from '@remixicon/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useLocalStorage } from 'react-use';
import styled from 'styled-components';

let Wrapper = styled(motion.div)`
  position: fixed;
  padding: 20px;
  background: black;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
  border-radius: 10px;
  z-index: 150;
  color: white;
`;

let Inner = styled(motion.div)`
  position: relative;
  height: 100%;
`;

let Header = styled.header`
  max-width: calc(100% - 40px);
`;

let Title = styled.h2`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 5px;
`;

let Description = styled.p`
  font-size: 14px;
  opacity: 0.8;
  font-weight: 500;
  margin-bottom: 20px;
`;

let VideoContainer = styled.div`
  width: 100%;
  border-radius: 10px;
  overflow: hidden;

  &[data-expanded='true'] {
    height: calc(100% - 200px) !important;
  }
`;

let Actions = styled.div`
  margin-top: 10px;
  display: flex;
`;

let Nav = styled.div`
  position: absolute;
  top: 0px;
  right: 0px;
`;

// Declare YouTube types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export let Explainer = (p: {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
}) => {
  let [isOpen, setIsOpen] = useLocalStorage(`explainer-${p.id}`, true);
  let [isExpanded, setIsExpanded] = useState(false);
  let playerRef = useRef<any>(null);
  let containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Load YouTube IFrame API
    if (!window.YT) {
      let tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      let firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    // Initialize player when API is ready
    let initPlayer = () => {
      if (window.YT && containerRef.current) {
        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId: p.youtubeId,
          width: '100%',
          height: isExpanded ? '100%' : '197',
          playerVars: {
            modestbranding: 1,
            rel: 0
          },
          events: {
            onStateChange: (event: any) => {
              // Expand when video starts playing
              if (event.data === window.YT.PlayerState.PLAYING) {
                // setIsExpanded(true);
              }
            }
          }
        });
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [isOpen, p.youtubeId]);

  // Update player size when expanded
  useEffect(() => {
    if (playerRef.current && playerRef.current.setSize) {
      if (isExpanded) {
        playerRef.current.setSize('100%', '50vh');
      } else {
        playerRef.current.setSize('100%', 197);
      }
    }
  }, [isExpanded]);

  return (
    <AnimatePresence>
      {isOpen && (
        <Wrapper
          style={
            isExpanded
              ? {
                  width: '90vw',
                  height: '90vh',
                  top: '5vh',
                  left: '5vw'
                }
              : {
                  width: 350,
                  bottom: 20,
                  right: 20
                }
          }
          initial={{
            opacity: 0,
            y: 50,
            filter: 'blur(10px)'
          }}
          animate={{
            opacity: 1,
            y: 0,
            filter: 'blur(0px)'
          }}
          exit={{ opacity: 0, y: 50, filter: 'blur(10px)' }}
          transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.4 }}
        >
          <Inner
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 100, damping: 20 }}
          >
            <Nav>
              <Button
                iconRight={<RiCloseLine />}
                title="Close"
                size="2"
                onClick={() => setIsOpen(false)}
              />
            </Nav>

            <Header>
              <Title>{p.title}</Title>
              <Description>{p.description}</Description>
            </Header>

            <VideoContainer ref={containerRef} style={{ height: isExpanded ? '50vh' : 197 }} />

            <Actions>
              <Button fullWidth size="3" color="white" onClick={() => setIsOpen(false)}>
                Got it!
              </Button>
            </Actions>
          </Inner>
        </Wrapper>
      )}
    </AnimatePresence>
  );
};
