// Explicit imported captions, not a heuristic for the prose after any image.
const captions = new Map([
  ['/images/d54677d80e2ae393.png', 'Infrastructure diagram'],
  ['/images/88e31043b1cf1078.png', 'Poupas, my personal finance application'],
  ['/images/fc793b674440e911.jpg', 'Photo by Diogo Palhais on Unsplash'],
  ['/images/64660d9ae20b8d7a.gif', 'My daily batch of new apartments to rent'],
]);
const text = node => node.value ?? (node.children ?? []).map(text).join('');
const image = node => node.type === 'image' ? node : (node.children ?? []).map(image).find(Boolean);
const html = value => ({ type: 'html', value });

export default function articleMarkdown() {
  return tree => {
    function transform(parent) {
      if (!parent.children) return;
      for (let i = 0; i < parent.children.length; i++) {
        const node = parent.children[i];
        // Match the existing renderer's one-level heading shift.
        if (node.type === 'heading') node.depth = Math.min(6, node.depth + 1);
        if (node.type === 'paragraph') {
          const img = image(node);
          const expected = img && captions.get(img.url);
          // Imported image-only links need a name even when the source alt was empty.
          if (expected && node.children.some(child => child.type === 'link' && image(child)) && !img.alt?.trim()) img.alt = expected;
          if (expected) {
            const next = parent.children[i + 1];
            const inline = text(node).trim() === expected;
            if (inline || (next?.type === 'paragraph' && text(next).trim() === expected)) {
              const caption = inline ? { type: 'paragraph', children: node.children.slice(1) } : next;
              if (inline) { node.children = node.children.slice(0, 1); caption.children[0].value = caption.children[0].value.trimStart(); }
              const replacement = [html('<figure class="article-image">'), node, html('<figcaption>'), { type: 'paragraph', children: caption.children, data: { hName: 'span' } }, html('</figcaption></figure>')];
              // Image paragraph becomes a span: no extra paragraph margins inside figures.
              node.data = { hName: 'span' };
              parent.children.splice(i, inline ? 1 : 2, ...replacement);
              i += replacement.length - 1;
              continue;
            }
          }
        }
        transform(node);
      }
    }
    transform(tree);
  };
}
