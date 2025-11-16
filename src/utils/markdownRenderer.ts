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
    // Count how many lines have pipes - must have at least 3 (header, separator, data)
    const lines = match.trim().split(/\r?\n/);
    const pipeLines = lines.filter(line => line.includes('|'));

    // Check if this looks like a table (has separator row with dashes and at least 3 rows)
    if (pipeLines.length >= 3 && /\|[\s:-]+\|/.test(match)) {
      return leadingNewline + '[table]\n';
    }
    // If doesn't meet criteria, keep original
    return match;
  });
};
