import { HTMLElement, Node, parse, TextNode } from 'node-html-parser'

export function htmlToDiscord(html: string): string {
    const root = parse(html, {
        blockTextElements: {
            script: false,
            noscript: false,
            style: false,
            pre: true,
        },
    })

    function render(node: Node): string {
        // Text node
        if (node instanceof TextNode) {
            return normalizeWhitespace(node.rawText)
        }

        if (!(node instanceof HTMLElement)) {
            return ''
        }

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        const tag = node.tagName?.toLowerCase()

        const elChildren = node.childNodes.map(render).join('')

        // IMPORTANT: guard against null/undefined tagName
        if (!tag) {
            return elChildren
        }

        // Render children first (recursive)
        const children = node.childNodes.map(render).join('')

        switch (tag) {
            // Bold
            case 'b':
            case 'strong':
                return wrap(children, '**')

            // Italic
            case 'i':
            case 'em':
                return wrap(children, '*')

            // Underline
            case 'u':
                return wrap(children, '__')

            // Strikethrough
            case 's':
            case 'strike':
            case 'del':
                return wrap(children, '~~')

            // Inline code
            case 'code':
                return `\`${children.trim()}\``

            // Code block
            case 'pre':
                return `\n\`\`\`\n${children.trim()}\n\`\`\`\n`

            // Links
            case 'a': {
                const href = node.getAttribute('href')
                const text = children.trim()

                if (!href) {
                    return text
                }

                // Discord doesn't support markdown links everywhere,
                // so we append the URL.
                if (text && text !== href) {
                    return `${text} (${href})`
                }

                return href
            }

            // Line break
            case 'br':
                return '\n'

            // List item
            case 'li':
                return `• ${children.trim()}\n`

            // Lists
            case 'ul':
            case 'ol':
                return `${children.trim()}\n`

            // Block-level elements
            case 'div':
            case 'p':
            case 'section':
            case 'article':
            case 'header':
            case 'footer':
            case 'main':
            case 'aside':
            case 'blockquote':
            case 'table':
            case 'tr':
                return block(children)

            // Headings
            case 'h1':
                return `# ${children.trim()}\n`

            case 'h2':
                return `## ${children.trim()}\n`

            case 'h3':
                return `### ${children.trim()}\n`

            case 'h4':
            case 'h5':
            case 'h6':
                return `**${children.trim()}**\n`

            // Default:
            // Just recursively render children
            default:
                return children
        }
    }

    let result = render(root)

    // Final cleanup
    result = cleanup(result)

    return result
}

/**
 * Wraps text only if it contains non-whitespace.
 */
function wrap(text: string, wrapper: string): string {
    const trimmed = text.trim()

    if (!trimmed) {
        return ''
    }

    return `${wrapper}${trimmed}${wrapper}`
}

/**
 * Handles block-level spacing safely.
 *
 * Prevents nested divs from generating:
 * \n\n\n\n\ntext
 *
 * Instead collapses into a single clean block separation.
 */
function block(text: string): string {
    const trimmed = text.trim()

    if (!trimmed) {
        return ''
    }

    return `\n${trimmed}\n`
}

/**
 * Normalizes text whitespace while preserving meaningful spaces.
 */
function normalizeWhitespace(text: string): string {
    return text.replaceAll(/\s+/gu, ' ')
}

/**
 * Cleans up excessive whitespace/newlines globally.
 */
function cleanup(text: string): string {
    return (
        text
            // Remove spaces before newlines
            .replaceAll(/[ \t]+\n/gu, '\n')

            // Collapse 3+ newlines into max 2
            .replaceAll(/\n{3,}/gu, '\n\n')

            // Collapse repeated spaces
            .replaceAll(/[ \t]{2,}/gu, ' ')

            // Trim final output
            .trim()
    )
}
