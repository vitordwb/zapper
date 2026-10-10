import React, { memo, useRef } from 'react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { marked } from 'marked';

interface Block {
  id: number;
  raw: string;
  type: string;
  code?: string;
}

interface BlockState {
  content: string;
  blocks: Block[];
  nextId: number;
}

const plugins = [remarkGfm];
const components = {
  a: ({ href, children }: React.ComponentProps<'a'>) => {
    const safe = href && /^(https?:|mailto:)/i.test(href);
    return safe ? (
      <a href={href} onClick={(event) => {
        event.preventDefault();
        void window.electron.openUrl(href);
      }}>{children}</a>
    ) : <span>{children}</span>;
  },
  img: ({ src, alt }: React.ComponentProps<'img'>) =>
    src && /^https:\/\//i.test(src) ? <img src={src} alt={alt || ''} loading="lazy" /> : <span>{alt}</span>,
};

function parseBlocks(content: string, streaming: boolean, previous: BlockState): BlockState {
  if (content === previous.content) return previous;
  // A growing response can only change the final block. Keep completed blocks
  // and their React keys; parse the mutable suffix again for incomplete syntax.
  const append = streaming && content.startsWith(previous.content) && previous.blocks.length > 0;
  const stable = append ? previous.blocks.slice(0, -1) : [];
  const offset = stable.reduce((length, block) => length + block.raw.length, 0);
  let nextId = previous.nextId;
  const oldTail = append ? previous.blocks.at(-1) : undefined;
  const blocks = [...stable];
  for (const token of marked.lexer(content.slice(offset), { gfm: true })) {
    const block: Block = {
      id: oldTail && blocks.length === stable.length ? oldTail.id : nextId++,
      raw: token.raw,
      type: token.type,
      ...(token.type === 'code' ? { code: token.text } : {}),
    };
    blocks.push(block);
  }
  return { content, blocks, nextId };
}

const MarkdownBlock = memo(function MarkdownBlock({ block, streaming }: { block: Block; streaming: boolean }) {
  if (block.type === 'code' && streaming) {
    return <pre><code>{block.code}</code></pre>;
  }
  return (
    <ReactMarkdown remarkPlugins={plugins} components={components} urlTransform={defaultUrlTransform}>
      {block.raw}
    </ReactMarkdown>
  );
});

export default function ChatMarkdown({ content, streaming }: { content: string; streaming: boolean }) {
  const state = useRef<BlockState>({ content: '', blocks: [], nextId: 0 });
  state.current = parseBlocks(content, streaming, state.current);
  const blocks = state.current.blocks;
  return <>{blocks.map((block, index) => (
    <MarkdownBlock key={block.id} block={block} streaming={streaming && index === blocks.length - 1} />
  ))}</>;
}
