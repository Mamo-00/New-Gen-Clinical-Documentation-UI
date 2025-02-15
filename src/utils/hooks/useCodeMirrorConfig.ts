import { useCallback } from "react";
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { autocompletion } from "@codemirror/autocomplete";
import { CompletionContext, CompletionResult } from '@codemirror/autocomplete';

interface CodeMirrorConfigProps {
  content: string;
  setContent: (content: string) => void;
  autoCompleteEnabled: boolean;
  getCompletions: (context: CompletionContext) => CompletionResult | null;
}

export const useCodeMirrorConfig = ({
  content,
  setContent,
  autoCompleteEnabled,
  getCompletions
}: CodeMirrorConfigProps) => {
  const createExtensions = useCallback(() => {
    const extensions = [
      EditorState.readOnly.of(false),
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          const newContent = update.state.doc.toString();
          setContent(newContent);
        }
      }),
      keymap.of(defaultKeymap)
    ];

    if (autoCompleteEnabled) {
      extensions.push(
        autocompletion({
          override: [getCompletions],
          maxRenderedOptions: 15,
          activateOnTyping: true
        })
      );
    }

    return extensions;
  }, [autoCompleteEnabled, setContent, getCompletions]);

  const createEditorState = useCallback(() => {
    return EditorState.create({
      doc: content || "",
      extensions: createExtensions()
    });
  }, [content, createExtensions]);

  return { createEditorState };
};