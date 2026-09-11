import { useEffect } from 'react';
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react';
import {
  Categories,
  EmojiClickData,
  EmojiStyle,
  SkinTonePickerLocation,
  SuggestionMode,
  Theme,
} from 'emoji-picker-react';
import dynamic from 'next/dynamic';

import ReactDOM from 'react-dom';

import { sendReactionMessage } from '@/actions/sendReactionMessage';
import { SupportChatsResponse } from '@/Interfaces';
import { useChatStore } from '@/store/useChatStore';

const EmojiPicker = dynamic(
  () => {
    return import('emoji-picker-react');
  },
  { ssr: false },
);

type ReactionPickerProps = {
  activeChat: SupportChatsResponse;
  bottomEl: HTMLDivElement | null;
};

const ReactionPickerComponent = ({ activeChat, bottomEl }: ReactionPickerProps) => {
  const setReactionState = useChatStore((s) => s.setReactionState);
  const reactionState = useChatStore((s) => s.reactionState);

  const reactions = ['1f44d', '2764-fe0f', '1f602', '1f62f', '1f622', '1f64f'];

  const hideReactionPicker = () => {
    bottomEl?.classList.remove('no-scroll');
    setReactionState({
      open: false,
      anchorEl: null,
      message: null,
    });
  };

  const { refs, floatingStyles } = useFloating({
    elements: {
      reference: reactionState.anchorEl as HTMLElement,
    },
    open: reactionState.open,
    placement: reactionState.message.from_me ? 'left-start' : 'right-start',
    middleware: [offset(8), flip(), shift({ padding: 10 })],
    whileElementsMounted: autoUpdate,
  });

  const handleReactionClick = async (emoji: EmojiClickData) => {
    if (!reactionState.message || !activeChat) return;

    try {
      hideReactionPicker(); // Fecha o picker
      const reaction = reactionState.message.reaction === emoji.emoji ? '' : emoji.emoji;
      const resp = await sendReactionMessage(
        activeChat.id,
        reaction,
        reactionState.message.message_id,
        activeChat.contact.remote_jid,
      );

      if (resp?.error) {
        console.log('Erro ao enviar reação:', resp.message);
      }
    } catch (err) {
      // console.log(err);
    }
  };

  // Lógica para fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const floatEl = refs.floating.current;
      if (
        reactionState.open &&
        floatEl &&
        !floatEl.contains(e.target as Node) &&
        reactionState.anchorEl &&
        !reactionState.anchorEl.contains(e.target as Node)
      ) {
        hideReactionPicker();
      }
    }

    if (reactionState.open) {
      const btn = document.querySelector('.epr-btn[title="Show all Emojis"]');
      if (btn) {
        btn.setAttribute('title', 'Mostrar todos emojis');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [reactionState.open, refs, reactionState.anchorEl]);

  if (!reactionState.open) return null;

  return ReactDOM.createPortal(
    <div
      ref={refs.setFloating}
      style={{
        ...floatingStyles,
        zIndex: 99999,
      }}
    >
      <EmojiPicker
        reactionsDefaultOpen={true}
        open={true}
        emojiStyle={EmojiStyle.APPLE}
        suggestedEmojisMode={SuggestionMode.RECENT}
        reactions={reactions}
        theme={Theme.DARK}
        skinTonePickerLocation={SkinTonePickerLocation.PREVIEW}
        emojiVersion="5.0"
        previewConfig={{ showPreview: false }}
        searchPlaceHolder="Pesquisar reação"
        onReactionClick={handleReactionClick}
        onEmojiClick={handleReactionClick}
        searchClearButtonLabel="Limpar"
        skinTonesDisabled
        lazyLoadEmojis
        categories={[
          {
            category: Categories.SUGGESTED,
            name: 'Recentes',
          },
          {
            category: Categories.SMILEYS_PEOPLE,
            name: 'Smileys & Pessoas',
          },
          {
            category: Categories.ANIMALS_NATURE,
            name: 'Animais & Natureza',
          },
          {
            category: Categories.FOOD_DRINK,
            name: 'Comida & Bebida',
          },
          {
            category: Categories.TRAVEL_PLACES,
            name: 'Viagens & Lugares',
          },
          {
            category: Categories.ACTIVITIES,
            name: 'Atividades',
          },
          {
            category: Categories.OBJECTS,
            name: 'Objetos',
          },
          {
            category: Categories.SYMBOLS,
            name: 'Simbolos',
          },
          {
            category: Categories.FLAGS,
            name: 'Bandeiras',
          },
        ]}
      />
    </div>,
    document.body,
  );
};

export default ReactionPickerComponent;
