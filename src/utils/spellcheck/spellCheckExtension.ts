import type { DecorationSet } from '@codemirror/view';
import { EditorView, ViewPlugin, ViewUpdate, Decoration } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';
import { checkWord } from './hunspellClient';

const misspelledWordDecoration = Decoration.mark({
  class: 'cm-misspelled',
  attributes: { 
    title: 'Misspelled word',
    style: 'border-bottom: 2px wavy #ff000080;' 
  }
});

const spellCheckField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(deco, tr) {
    deco = deco.map(tr.changes);
    
    if (tr.docChanged || tr.effects.some(e => e.is(spellCheckEffect))) {
      const decorations: any[] = [];
      const docString = tr.state.doc.toString();
      
      for (let pos = 0; pos < docString.length;) {
        const word = tr.state.wordAt(pos);
        if (!word) break;
        
        const wordText = docString.slice(word.from, word.to);
        if (!checkWord(wordText)) {
          decorations.push(misspelledWordDecoration.range(word.from, word.to));
        }
        pos = word.to + 1;
      }
      
      return Decoration.set(decorations);
    }
    
    return deco;
  },
  provide: f => EditorView.decorations.from(f)
});

const spellCheckEffect = StateEffect.define<void>();
const spellCheckPlugin = ViewPlugin.fromClass(class {
  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      update.view.dispatch({
        effects: spellCheckEffect.of()
      });
    }
  }
});

export function spellCheckExtension() {
  return [
    spellCheckField,
    spellCheckPlugin,
    EditorView.baseTheme({
      '.cm-misspelled': { 
        cursor: 'pointer',
        textDecoration: 'none !important'
      }
    })
  ];
}