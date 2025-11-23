import { Interweave as BaseInterweave } from 'interweave';
import { UrlMatcher } from 'interweave-autolink';
import { EmojiMatcher, useEmojiData } from 'interweave-emoji';
// import ImgMatcher from './ImgMatcher';
import {
  SimpleBoldMatcher,
  SimpleCodeMatcher,
  SimpleItalicMatcher,
  SimpleStrikeMatcher,
} from './SimpleFormatMatchers';

const globalMatchers = [
  // new ImgMatcher('img', { onRender: props.onRender }),
  new UrlMatcher('url', { validateTLD: false }),
  new EmojiMatcher('emoji', {
    convertEmoticon: true,
    convertShortcode: false,
    renderUnicode: true,
    enlargeThreshold: 64,
    convertUnicode: false,
  }),
  new SimpleBoldMatcher('bold'),
  new SimpleItalicMatcher('italic'),
  new SimpleStrikeMatcher('strike'),
  new SimpleCodeMatcher('code'),
];
export default function Interweave({ filters = [], matchers = [], ...props }) {
  const [, source] = useEmojiData({
    compact: false,
    shortcodes: ['emojibase'],
  });

  return (
    <BaseInterweave
      filters={filters}
      matchers={[...globalMatchers, ...matchers]}
      emojiSource={source}
      newWindow
      {...props}
    />
  );
}
