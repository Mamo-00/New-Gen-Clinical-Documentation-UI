import React, { useEffect, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { Mention as QuillMention } from "quill-mention";
import "quill-mention/dist/quill.mention.css";
import { useDictionaryManager } from "../Dictionary/useDictionaryManager";

// Register the mention module with Quill
Quill.register("modules/mention", QuillMention);

// Define the props for Editor
interface EditorProps {
  autocompleteEnabled: boolean;
  templateLogicEnabled: boolean;
}

const Editor: React.FC<EditorProps> = ({ autocompleteEnabled, templateLogicEnabled }) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const { getMergedDictionary } = useDictionaryManager();

  useEffect(() => {
    if (!editorRef.current) return;

    // Initialize Quill instance
    const quill = new Quill(editorRef.current, {
      theme: "snow",
      modules: {
        toolbar: false, // Disable toolbar for simplicity
        mention: autocompleteEnabled
          ? {
              allowedChars: /^[A-Za-z\s]*$/,
              mentionDenotationChars: [" "], // Trigger after a space
              source: async (searchTerm: string, renderList: Function) => {
                if (searchTerm.length < 3) return; // Trigger only after 3 characters

                // Fetch merged dictionary and filter matches
                const matches = getMergedDictionary().filter((term) =>
                  term.toLowerCase().startsWith(searchTerm.toLowerCase())
                );

                // Render the list of matches
                renderList(
                  matches.map((term, index) => ({ id: index, value: term })), // Format suggestions
                  searchTerm
                );
              },
            }
          : undefined, // Disable mention module if autocomplete is disabled
      },
    });

    // Cleanup
    return () => {
      quill.off("text-change");
    };
  }, [autocompleteEnabled, getMergedDictionary]);

  return (
    <div
      ref={editorRef}
      style={{
        height: "300px",
        width: "600px",
        marginLeft: "auto",
        marginRight: "auto",
        marginTop: "20px",
        border: templateLogicEnabled ? "2px solid #4caf50" : "1px solid #ccc", // Example: Highlight if template logic is enabled
      }}
    />
  );
};

export default Editor;
