// Content migration utilities for transitioning from Quill to Tiptap

export const migrateQuillToTiptap = (quillContent: string): string => {
  if (!quillContent || typeof quillContent !== 'string') {
    return '';
  }

  let content = quillContent;

  // Handle Quill's specific HTML structures and convert them to Tiptap-compatible format
  
  // Convert Quill's paragraph structure
  content = content.replace(/<p><br><\/p>/g, '<p></p>');
  
  // Handle Quill's list structures
  content = content.replace(/<ol data-list="ordered">/g, '<ol>');
  content = content.replace(/<ul data-list="bullet">/g, '<ul>');
  
  // Handle Quill's alignment classes
  content = content.replace(/class="ql-align-center"/g, 'style="text-align: center"');
  content = content.replace(/class="ql-align-right"/g, 'style="text-align: right"');
  content = content.replace(/class="ql-align-justify"/g, 'style="text-align: justify"');
  
  // Handle Quill's indentation
  content = content.replace(/class="ql-indent-(\d+)"/g, (match, level) => {
    const indent = parseInt(level) * 30; // 30px per indent level
    return `style="margin-left: ${indent}px"`;
  });
  
  // Handle Quill's font size classes
  content = content.replace(/class="ql-size-small"/g, 'style="font-size: 0.75em"');
  content = content.replace(/class="ql-size-large"/g, 'style="font-size: 1.5em"');
  content = content.replace(/class="ql-size-huge"/g, 'style="font-size: 2.5em"');
  
  // Handle Quill's font family
  content = content.replace(/class="ql-font-serif"/g, 'style="font-family: serif"');
  content = content.replace(/class="ql-font-monospace"/g, 'style="font-family: monospace"');
  
  // Clean up any remaining Quill-specific classes
  content = content.replace(/class="ql-[^"]*"/g, '');
  
  // Remove empty class attributes
  content = content.replace(/\s+class=""\s*/g, ' ');
  content = content.replace(/\s+class=""/g, '');
  
  // Handle Quill's blockquote structure
  content = content.replace(/<blockquote>/g, '<blockquote>');
  
  // Ensure proper paragraph structure for Tiptap
  if (content && !content.includes('<p>') && !content.includes('<h1>') && !content.includes('<h2>') && !content.includes('<ul>') && !content.includes('<ol>') && !content.includes('<blockquote>')) {
    // If it's plain text or simple HTML, wrap in paragraph
    content = `<p>${content}</p>`;
  }
  
  // Clean up multiple spaces and normalize whitespace
  content = content.replace(/\s+/g, ' ').trim();
  
  return content;
};

export const isQuillContent = (content: string): boolean => {
  if (!content || typeof content !== 'string') {
    return false;
  }
  
  // Check for Quill-specific patterns
  return content.includes('ql-') || 
         content.includes('data-list=') ||
         content.includes('<p><br></p>');
};