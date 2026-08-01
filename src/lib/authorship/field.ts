/**
 * The name of the hidden field that carries provenance alongside a textarea.
 *
 * Its own module, with no React in it, so the Server Action that reads the
 * field and the client component that writes it can agree on the name without
 * the server pulling in a client component to find out what it is called.
 *
 * What travels under this name is six integers as JSON: characters typed,
 * characters pasted, the largest single paste, how many pastes, corrections,
 * and how long the field was being worked on. Never keystrokes, never the
 * clipboard's contents, never the text that was deleted.
 */
export const provenanceField = (name: string) => `${name}__provenance`;
