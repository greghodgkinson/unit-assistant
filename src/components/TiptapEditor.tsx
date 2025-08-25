import React, { useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { migrateQuillToTiptap, isQuillContent } from '../utils/contentMigration';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough, 
  List, 
  ListOrdered, 
  Quote, 
  Code, 
  Link as LinkIcon,
  Table as TableIcon,
  Plus,
  Minus,
  Undo,
  Redo,
  Palette,
  Highlighter,
  Copy
} from 'lucide-react';

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export interface TiptapEditorRef {
  focus: () => void;
  getEditor: () => any;
}

export const TiptapEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(({
  content,
  onChange,
  placeholder = "Start typing...",
  className = "",
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false
}, ref) => {
  const [copySuccess, setCopySuccess] = useState(false);

  // Migrate Quill content to Tiptap format if needed
  const migratedContent = React.useMemo(() => {
    if (isQuillContent(content)) {
      console.log('Migrating Quill content to Tiptap format');
      return migrateQuillToTiptap(content);
    }
    return content;
  }, [content]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, // We'll handle undo/redo externally
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800',
        },
      }),
    ],
    content: migratedContent,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4',
      },
    },
  });

  useImperativeHandle(ref, () => ({
    focus: () => editor?.commands.focus(),
    getEditor: () => editor,
  }));

  useEffect(() => {
    if (editor && migratedContent !== editor.getHTML()) {
      editor.commands.setContent(migratedContent);
    }
  }, [migratedContent, editor]);

  if (!editor) {
    return null;
  }

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const deleteTable = () => {
    editor.chain().focus().deleteTable().run();
  };

  const addColumnBefore = () => {
    editor.chain().focus().addColumnBefore().run();
  };

  const addColumnAfter = () => {
    editor.chain().focus().addColumnAfter().run();
  };

  const deleteColumn = () => {
    editor.chain().focus().deleteColumn().run();
  };

  const addRowBefore = () => {
    editor.chain().focus().addRowBefore().run();
  };

  const addRowAfter = () => {
    editor.chain().focus().addRowAfter().run();
  };

  const deleteRow = () => {
    editor.chain().focus().deleteRow().run();
  };

  const copyToClipboard = async () => {
    if (!editor) return;
    
    try {
      // Get HTML content and clean it for better Word compatibility
      let htmlContent = editor.getHTML();
      const textContent = editor.getText();
      
      // Enhance HTML for better Word compatibility
      htmlContent = htmlContent
        // Ensure proper paragraph structure
        .replace(/<p><\/p>/g, '<p>&nbsp;</p>')
        // Add Word-friendly table styling
        .replace(/<table>/g, '<table border="1" cellpadding="4" cellspacing="0" style="border-collapse: collapse; width: 100%;">')
        // Ensure proper list formatting
        .replace(/<ul>/g, '<ul style="margin: 0; padding-left: 20px;">')
        .replace(/<ol>/g, '<ol style="margin: 0; padding-left: 20px;">')
        // Add proper styling for better Word interpretation
        .replace(/<strong>/g, '<strong style="font-weight: bold;">')
        .replace(/<em>/g, '<em style="font-style: italic;">')
        .replace(/<u>/g, '<u style="text-decoration: underline;">');
      
      // Create a more comprehensive HTML document for Word
      const fullHtmlContent = `
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; }
              table { border-collapse: collapse; width: 100%; margin: 10px 0; }
              th, td { border: 1px solid #000; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; font-weight: bold; }
              ul, ol { margin: 10px 0; padding-left: 20px; }
              p { margin: 10px 0; }
              blockquote { margin: 10px 0; padding-left: 20px; border-left: 3px solid #ccc; }
            </style>
          </head>
          <body>
            ${htmlContent}
          </body>
        </html>
      `;
      
      // Create clipboard data with both HTML and plain text
      const clipboardData = new ClipboardItem({
        'text/html': new Blob([fullHtmlContent], { type: 'text/html' }),
        'text/plain': new Blob([textContent], { type: 'text/plain' })
      });
      
      await navigator.clipboard.write([clipboardData]);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Fallback for older browsers - copy as plain text
      try {
        const textArea = document.createElement('textarea');
        textArea.value = editor.getText();
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed: ', fallbackErr);
      }
    }
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const isTableActive = editor.isActive('table');

  return (
    <div className={`border border-gray-300 rounded-lg ${className}`}>
      {/* Toolbar */}
      <div className="border-b border-gray-300 p-2 flex flex-wrap gap-1 bg-gray-50">
        {/* Undo/Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* Text Formatting */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-gray-300' : ''}`}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-gray-300' : ''}`}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('underline') ? 'bg-gray-300' : ''}`}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('strike') ? 'bg-gray-300' : ''}`}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* Lists */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-gray-300' : ''}`}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-gray-300' : ''}`}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* Other Formatting */}
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('blockquote') ? 'bg-gray-300' : ''}`}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('code') ? 'bg-gray-300' : ''}`}
          title="Inline Code"
        >
          <Code className="h-4 w-4" />
        </button>
        <button
          onClick={setLink}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('link') ? 'bg-gray-300' : ''}`}
          title="Link"
        >
          <LinkIcon className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* Copy to Clipboard */}
        <button
          onClick={copyToClipboard}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            copySuccess ? 'bg-green-100 text-green-700' : 'text-gray-700'
          }`}
          title={copySuccess ? 'Copied with formatting!' : 'Copy all content with formatting to clipboard'}
        >
          <Copy className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* Table Controls */}
        <button
          onClick={addTable}
          className="p-2 rounded hover:bg-gray-200"
          title="Insert Table"
        >
          <TableIcon className="h-4 w-4" />
        </button>

        {isTableActive && (
          <>
            <button
              onClick={addColumnBefore}
              className="p-2 rounded hover:bg-gray-200"
              title="Add Column Before"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={addColumnAfter}
              className="p-2 rounded hover:bg-gray-200"
              title="Add Column After"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={deleteColumn}
              className="p-2 rounded hover:bg-gray-200"
              title="Delete Column"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              onClick={addRowBefore}
              className="p-2 rounded hover:bg-gray-200"
              title="Add Row Before"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={addRowAfter}
              className="p-2 rounded hover:bg-gray-200"
              title="Add Row After"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={deleteRow}
              className="p-2 rounded hover:bg-gray-200"
              title="Delete Row"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              onClick={deleteTable}
              className="p-2 rounded hover:bg-gray-200 text-red-600"
              title="Delete Table"
            >
              <TableIcon className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto max-h-full" style={{ minHeight: '200px' }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
});

TiptapEditor.displayName = 'TiptapEditor';