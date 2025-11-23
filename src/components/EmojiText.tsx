import { Interweave } from 'interweave';
import { EmojiMatcher } from 'interweave-emoji';

export function EmojiText({ text }: { text: string }) {
  return (
    <Interweave
      content={text}
      matchers={[new EmojiMatcher('emoji')]}
    />
  );
}
