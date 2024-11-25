"use client";

import { PropsWithChildren, ReactNode } from 'react';
import { useDisclosure } from '@mantine/hooks';
import { Box, Popover } from '@mantine/core';

import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export interface TooltipProps {
  data: string | undefined
}
export function Tooltip({ data, children }: PropsWithChildren<TooltipProps>): ReactNode {
  if (!data) {
    return <>{children}</>;
  }

  const [opened, { close, open }] = useDisclosure(false);

  return (
    <Popover position="bottom" withArrow shadow="md" opened={opened}>
      <Popover.Target>
        <Box component='span' display="inline" onMouseEnter={open} onMouseLeave={close}>
          {children}
        </Box>
      </Popover.Target>
      <Popover.Dropdown>
        <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
          {data}
        </Markdown>
      </Popover.Dropdown>
    </Popover>
  );
}

export default Tooltip;