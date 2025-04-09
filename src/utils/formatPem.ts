/**
 * Formats a key into proper PEM format
 * @param keyData The raw key data to format
 * @param type The type of key (defaults to 'PRIVATE KEY')
 * @returns The formatted PEM string with proper headers and line breaks
 */
export const formatPEM = (keyData: string, type = 'PRIVATE KEY'): string => {
    // Remove sk_ or pk_ prefix if present
    const keyWithoutPrefix = keyData.replace(/^(sk_|pk_)/, '');

    const trimmedKey = keyWithoutPrefix.trim(); 

    // Remove all headers, spaces, and existing line breaks
    const cleanedKey = trimmedKey.replace(/-----(BEGIN|END) .*?-----|\s/g, '');

    // Split key into 64 character lines
    const chunks = [];
    for (let i = 0; i < cleanedKey.length; i += 64) {
        chunks.push(cleanedKey.substring(i, i + 64));
    }

    // Rebuild proper PEM format
    return `-----BEGIN ${type}-----\n${chunks.join('\n')}\n-----END ${type}-----`;
}