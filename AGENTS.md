<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Store architecture

- Keep the five-product catalog in a shared browser-safe module so storefront, product pages and quiz use the same product information.
- Use a dynamic product route with a validated slug and related-product links to keep all product pages consistent.
- Store uploaded media through Lovable Assets pointers; preserve the original intro upload and use visually unchanged playback transcodes for browser compatibility.
- Keep this storefront presentation-only, with no delivery, payments, checkout or persistence services.
- Define visual roles in the global stylesheet and button variants so page styling stays consistent.
