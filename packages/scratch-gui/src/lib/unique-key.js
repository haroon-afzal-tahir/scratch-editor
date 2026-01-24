/**
 * Unique Key Generation Utility
 *
 * Provides deterministic, unique key generation for React lists.
 * Keys are purely hash-based with no global state - same input always produces same output.
 */

/**
 * djb2 hash function - simple, fast, and produces good distribution
 * @param {string} str - Input string to hash
 * @returns {string} - Hash string in base36
 */
const hashString = str => {
    if (typeof str !== 'string') {
        str = String(str ?? '');
    }
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
};

/**
 * Generate a unique key from parts.
 * The key is deterministic - same inputs always produce the same output.
 *
 * @param {string} prefix - A prefix to identify the type of item
 * @param {number} index - The index of the item in the list (REQUIRED for uniqueness)
 * @param  {...any} parts - Additional parts to include in the key
 * @returns {string} - A unique key string
 */
const makeKey = (prefix, index, ...parts) => {
    // Always include the index as the primary differentiator
    const keyParts = [String(index)];

    for (const part of parts) {
        if (part == null) continue;

        if (typeof part === 'object') {
            // Extract identifying properties from objects
            if (part.id != null) keyParts.push(String(part.id));
            else if (part.name != null) keyParts.push(String(part.name));
            else if (part.key != null) keyParts.push(String(part.key));
        } else {
            keyParts.push(String(part));
        }
    }

    return `${prefix}-${index}-${hashString(keyParts.join('|'))}`;
};

/**
 * Pre-built key generators for common use cases.
 * Each generator produces deterministic keys based on item properties + index.
 */
const keyGenerators = {
    /**
     * For sprite lists
     */
    sprite: (sprite, index) => makeKey('spr', index, sprite?.id, sprite?.name),

    /**
     * For alert lists
     */
    alert: (alert, index) => makeKey('alt', index, alert?.alertId, alert?.extensionId, alert?.level),

    /**
     * For asset/costume/sound lists
     */
    asset: (asset, index) => makeKey('ast', index, asset?.assetId, asset?.name, asset?.md5),

    /**
     * For library items
     */
    library: (item, index) => makeKey('lib', index, item?.extensionId, item?.name, item?.md5),

    /**
     * For menu items
     */
    menuItem: (item, index) => {
        const title = typeof item?.title === 'string'
            ? item.title
            : item?.title?.props?.id || item?.title?.props?.defaultMessage;
        return makeKey('mnu', index, title);
    },

    /**
     * For tag buttons
     */
    tag: (tag, index) => makeKey('tag', index, tag?.tag, tag?.intlLabel?.id),

    /**
     * For card deck items
     */
    deck: (id, content, index) => makeKey('dck', index, id, content?.name),

    /**
     * For loader messages
     */
    loaderMessage: (msg, index) => makeKey('ldr', index, msg?.message?.props?.id),

    /**
     * For toggle buttons
     */
    toggleButton: (button, index) => makeKey('tgl', index, button?.title),

    /**
     * For action menu buttons
     */
    actionButton: (button, index, parentId) => {
        const title = typeof button?.title === 'string'
            ? button.title
            : button?.title?.props?.defaultMessage;
        return makeKey('act', index, parentId, title);
    },

    /**
     * For debug modal sections
     */
    debugSection: (section, index) => makeKey('dbg', index, section?.id, section?.title?.id),

    /**
     * For connection dots
     */
    dot: (index, total) => makeKey('dot', index, total),

    /**
     * For step pips
     */
    pip: (index, total) => makeKey('pip', index, total),

    /**
     * For meter bars
     */
    meterBar: (index, total) => makeKey('bar', index, total),

    /**
     * For React children (used with React.Children.map/cloneElement)
     * Preserves existing key if present, otherwise generates one.
     */
    child: (child, index) => {
        // If child already has a key, use it (React.Children.map assigns keys)
        if (child?.key != null) {
            return child.key;
        }

        // Generate a key based on the child's type and props
        const typeName = child?.type
            ? (typeof child.type === 'string'
                ? child.type
                : child.type.displayName || child.type.name || 'Component')
            : 'unknown';

        return makeKey('child', index, typeName, child?.props?.id);
    }
};

export {
    hashString,
    makeKey,
    keyGenerators
};

export default keyGenerators;
