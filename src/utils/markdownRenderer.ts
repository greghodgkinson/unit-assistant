import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
  typographer: true,
});

export const renderMarkdown = (text: string): string => {
  return md.render(text);
};

export const replaceTablesWithPlaceholder = (text: string): string => {
  // Match markdown tables anywhere in the text
  // A table consists of consecutive lines that contain pipes (|)
  // This is more forgiving and handles tables with or without trailing pipes
  const tableRegex = /(^|\n)(\|.+(\r?\n|$))+/gm;

  return text.replace(tableRegex, (match, leadingNewline) => {
    // Count how many lines have pipes - must have at least 3 rows
    const lines = match.trim().split(/\r?\n/);
    const pipeLines = lines.filter(line => line.includes('|'));

    // Check if this looks like a table
    // Option 1: Has separator row with dashes (traditional markdown)
    // Option 2: Has at least 3 rows with multiple pipes (looks like a table)
    const hasSeparator = /\|[\s:-]+\|/.test(match);
    const hasMultiplePipes = pipeLines.some(line => (line.match(/\|/g) || []).length >= 3);

    if (pipeLines.length >= 3 && (hasSeparator || hasMultiplePipes)) {
      return leadingNewline + '[table]\n';
    }
    // If doesn't meet criteria, keep original
    return match;
  });
};
