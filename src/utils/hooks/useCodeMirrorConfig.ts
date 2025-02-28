// utils/hooks/useCodeMirrorConfig.ts
import { useCallback } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { autocompletion } from "@codemirror/autocomplete";
import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { linter, Diagnostic } from "@codemirror/lint";
import { SpellCheckerService } from "../../services/SpellCheckerService";

const MAX_LINE_LENGTH = 90; // Set your desired max line length

interface CodeMirrorConfigProps {
  content: string;
  setContent: (content: string) => void;
  autoCompleteEnabled: boolean;
  spellCheckEnabled: boolean;
  getCompletions: (context: CompletionContext) => CompletionResult | null;
  spellChecker: SpellCheckerService | null;
}

/**
 * Returns a CodeMirror configuration hook.
 * If spell checking is enabled (and our spellChecker exists), a linter extension is added.
 */
export const useCodeMirrorConfig = ({
  content,
  setContent,
  autoCompleteEnabled,
  spellCheckEnabled,
  getCompletions,
  spellChecker,
}: CodeMirrorConfigProps) => {
  const createExtensions = useCallback(() => {
    const extensions = [
      // Allow editing.
      EditorState.readOnly.of(false),
      // Update external state on document changes.
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newContent = update.state.doc.toString();
          setContent(newContent);

          // Force newline after a certain character length without breaking words
          const lines = newContent.split("\n");
          const formattedLines = lines.map((line) => {
            const words = line.split(" ");
            let currentLine = "";
            const result = [];

            for (const word of words) {
              if (currentLine.length + word.length + 1 > MAX_LINE_LENGTH) {
                result.push(currentLine);
                currentLine = word; // Start a new line with the current word
              } else {
                currentLine += (currentLine.length ? " " : "") + word; // Add word to the current line
              }
            }
            if (currentLine) result.push(currentLine); // Add the last line
            return result.join("\n"); // Join lines with newlines
          });
          const formattedContent = formattedLines.join("\n");
          if (formattedContent !== newContent) {
            update.view.dispatch({
              changes: {
                from: 0,
                to: newContent.length,
                insert: formattedContent,
              },
            });
          }
        }
      }),
      keymap.of(defaultKeymap),
    ];

    if (autoCompleteEnabled) {
      extensions.push(
        autocompletion({
          override: [getCompletions],
          maxRenderedOptions: 15,
          activateOnTyping: true,
        })
      );
    }

    if (spellCheckEnabled && spellChecker) {
      // A simple linter extension that checks every word.
      const spellcheckLinter = linter(
        (view) => {
          const diagnostics: Diagnostic[] = [];
          const docText = view.state.doc.toString();
          // Match one or more letters from any language, including Norwegian
          const wordRegex = /\p{Letter}+/gu;

          let match: RegExpExecArray | null;
          while ((match = wordRegex.exec(docText)) !== null) {
            const word = match[0];
            const from = match.index;
            const to = from + word.length;

            if (!spellChecker.checkWord(word)) {
              diagnostics.push({
                from,
                to,
                severity: "error",
                message: `Spelling error: "${word}"`,
              });
            }
          }
          return diagnostics;
        },
        {
          needsRefresh: () => true, // This forces the linter to always re-run
        }
      );

      extensions.push(spellcheckLinter);
    }

    return extensions;
  }, [
    autoCompleteEnabled,
    spellCheckEnabled,
    setContent,
    getCompletions,
    spellChecker,
  ]);

  const createEditorState = useCallback(() => {
    return EditorState.create({
      doc: content || "",
      extensions: createExtensions(),
    });
  }, [content, createExtensions]);

  return { createEditorState };
};
