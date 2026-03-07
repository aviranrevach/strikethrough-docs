/**
 * Text transformation functions for Change Case feature.
 */

const TextTransforms = {
  toUpperCase(text) {
    return text.toUpperCase();
  },

  toLowerCase(text) {
    return text.toLowerCase();
  },

  toTitleCase(text) {
    return text.replace(/\S+/g, (word) => {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
  },

  toSentenceCase(text) {
    return text.toLowerCase().replace(/(^\s*|[.!?]\s+)(\w)/g, (match, separator, char) => {
      return separator + char.toUpperCase();
    });
  }
};
