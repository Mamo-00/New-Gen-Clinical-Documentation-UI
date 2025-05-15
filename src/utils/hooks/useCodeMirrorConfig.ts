import { useCallback, useRef, useMemo } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, undo, redo } from "@codemirror/commands";
import { autocompletion, Completion } from "@codemirror/autocomplete";
import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { linter, Diagnostic } from "@codemirror/lint";
import { SpellCheckerService } from "../../services/SpellCheckerService";
import { MacroTemplate } from "../templates/macroTemplateService";
const MAX_LINE_LENGTH = 85; // Set your desired max line length

interface CodeMirrorConfigProps {
  content: string;
  setContent: (content: string) => void;
  autoCompleteEnabled: boolean;
  spellCheckEnabled: boolean;
  getCompletions: (context: CompletionContext) => CompletionResult | null;
  spellChecker: SpellCheckerService | null;
  editorId: string; // Add editorId to know which editor is being configured
  handleTemplateSelection?: (template: MacroTemplate) => void; // Optional handler for template selection
  setSelectedTemplate?: (template: any) => void; // Added for direct template context update
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
  editorId,
  handleTemplateSelection,
  setSelectedTemplate,
}: CodeMirrorConfigProps) => {
  // Use refs to store values that shouldn't trigger rerenders
  const lastContentRef = useRef(content);
  const autoCompleteEnabledRef = useRef(autoCompleteEnabled);
  const spellCheckEnabledRef = useRef(spellCheckEnabled);
  const getCompletionsRef = useRef(getCompletions);
  const spellCheckerRef = useRef(spellChecker);
  const handleTemplateSelectionRef = useRef(handleTemplateSelection);
  const setSelectedTemplateRef = useRef(setSelectedTemplate);
  
  // Update refs when props change
  if (autoCompleteEnabledRef.current !== autoCompleteEnabled) {
    autoCompleteEnabledRef.current = autoCompleteEnabled;
  }
  
  if (spellCheckEnabledRef.current !== spellCheckEnabled) {
    spellCheckEnabledRef.current = spellCheckEnabled;
  }
  
  if (getCompletionsRef.current !== getCompletions) {
    getCompletionsRef.current = getCompletions;
  }
  
  if (spellCheckerRef.current !== spellChecker) {
    spellCheckerRef.current = spellChecker;
  }
  
  if (handleTemplateSelectionRef.current !== handleTemplateSelection) {
    handleTemplateSelectionRef.current = handleTemplateSelection;
  }
  
  if (setSelectedTemplateRef.current !== setSelectedTemplate) {
    setSelectedTemplateRef.current = setSelectedTemplate;
  }
  
  
    const handler = (context: CompletionContext): CompletionResult | null => {
      // Create a tracker for this completion process
      // const tracker = trackCompletionProcess(`completion-${editorId}`);
      
      // Check for template trigger before calling getCompletions
      const beforeText = context.state.doc.sliceString(
        Math.max(0, context.pos - 20), 
        context.pos
      );
      
      // Use the ref to get the current getCompletions function
      const result = getCompletionsRef.current(context);
      if (!result) {
        return null;
      }
      // If result exists and handleTemplateSelection is provided, 
      // enhance options with additional functionality
      if (result && handleTemplateSelectionRef.current) {
        const options = result.options.map(option => {
          // If this is a snippet option with template info
          if (option.type === 'snippet' && option.info && typeof option.info === 'string') {
            const optionApply = option.apply;
            return {
              ...option,
              apply: (view: EditorView, completion: Completion, from: number, to: number) => {
                // First let the default apply method handle the text insertion if it exists
                if (typeof optionApply === 'function') {
                  optionApply(view, completion, from, to);
                }
                // Then handle template selection if this is a macro template
                const category = typeof option.detail === 'string' 
                  ? option.detail.replace(' template', '') 
                  : 'unknown';
                // Ensure the editor retains focus
                setTimeout(() => {
                  if (view) {
                    view.focus();
                  }
                  // Create template object with both templateText and explicitly set originalText
                  const templateText = option.info as string;
                  if (setSelectedTemplateRef.current) {
                    setSelectedTemplateRef.current({
                      text: templateText,
                      originalText: templateText,
                      category: category,
                      timestamp: Date.now()
                    });
                  }
                  const currentHandler = handleTemplateSelectionRef.current;
                  if (currentHandler) {
                    currentHandler({
                      name: option.label,
                      category: category,
                      templateText: templateText,
                      originalText: templateText, 
                      snippet: ''
                    });
                  }
                }, 10);
              }
            };
          }
          return option;
        });
        const enhancedResult = {
          ...result,
          options
        };
        return enhancedResult;
      }
      return result;
    };
  
  // Create extensions only once and memoize them
  const createExtensions = useMemo(() => {
    const extensions = [
      // Add history extension for undo/redo
      history(),
      // Add keyboard shortcuts
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        {
          key: "Mod-z",
          run: (view) => {
            undo(view);
            return true;
          }
        },
        {
          key: "Mod-y",
          run: (view) => {
            redo(view);
            return true;
          }
        }
      ]),
      // Allow editing.
      EditorState.readOnly.of(false),
      // Update external state on document changes.
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newContent = update.state.doc.toString();
          // Only update if content has actually changed
          if (newContent !== lastContentRef.current) {
            lastContentRef.current = newContent;
            setContent(newContent);
          }
          // Force newline after a certain character length without breaking words,
          // but only if there's a significant difference to avoid excessive updates
          const lines = newContent.split("\n");
          const formattedLines = lines.map((line) => {
            if (line.length <= MAX_LINE_LENGTH) {
              return line;
            }
            const words = line.split(" ");
            let currentLine = "";
            const result = [];
            for (const word of words) {
              if (currentLine.length + word.length + 1 > MAX_LINE_LENGTH) {
                result.push(currentLine);
                currentLine = word;
              } else {
                currentLine += (currentLine.length ? " " : "") + word;
              }
            }
            if (currentLine) result.push(currentLine);
            return result.join("\n");
          });
          const formattedContent = formattedLines.join("\n");
          if (formattedContent !== newContent) {
            const selection = update.state.selection;
            update.view.dispatch({
              changes: {
                from: 0,
                to: newContent.length,
                insert: formattedContent,
              },
              selection: selection,
              scrollIntoView: true
            });
            lastContentRef.current = formattedContent;
          }
        }
      }),
    ];
    if (autoCompleteEnabledRef.current) {
      extensions.push(
        autocompletion({
          override: [handler],
          maxRenderedOptions: 15,
          activateOnTyping: true,
          defaultKeymap: true,
          icons: false,
          closeOnBlur: false,
          aboveCursor: false,
          optionClass: option => option.type === 'snippet' ? 'cm-template-option' : ''
        })
      );
    }
    if (spellCheckEnabledRef.current && spellCheckerRef.current) {
      const spellcheckLinter = linter(
        (view) => {
          const diagnostics: Diagnostic[] = [];
          const docText = view.state.doc.toString();
          const wordRegex = /\p{Letter}+/gu;
          const currentSpellChecker = spellCheckerRef.current;
          if (!currentSpellChecker) return diagnostics;
          let match: RegExpExecArray | null;
          while ((match = wordRegex.exec(docText)) !== null) {
            const word = match[0];
            const from = match.index;
            const to = from + word.length;
            if (!currentSpellChecker.checkWord(word)) {
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
          needsRefresh: (update) => {
            return update.docChanged && 
              (update.transactions.some(tr => tr.isUserEvent("input") || tr.isUserEvent("delete")));
          },
          delay: 300,
        }
      );
      extensions.push(spellcheckLinter);
    }
    return extensions;
  }, [editorId, autoCompleteEnabled, spellCheckEnabled]);

  const createEditorState = useCallback(() => {
    return EditorState.create({
      doc: content || "",
      extensions: createExtensions,
    });
  }, [editorId]);

  return { createEditorState };
};