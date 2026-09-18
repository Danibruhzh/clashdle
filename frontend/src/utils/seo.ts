import { useEffect } from 'react'

interface SeoMeta {
  title: string
  description: string
  canonicalUrl: string
}

function setMetaByName(name: string, content: string) {
  const tag = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (tag) tag.content = content
}

function setMetaByProperty(property: string, content: string) {
  const tag = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
  if (tag) tag.content = content
}

function setCanonical(href: string) {
  const tag = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (tag) tag.href = href
}

export function useSeoMeta({ title, description, canonicalUrl }: SeoMeta) {
  useEffect(() => {
    document.title = title
    setCanonical(canonicalUrl)
    setMetaByName('description', description)
    setMetaByName('twitter:title', title)
    setMetaByName('twitter:description', description)
    setMetaByProperty('og:title', title)
    setMetaByProperty('og:description', description)
    setMetaByProperty('og:url', canonicalUrl)
  }, [canonicalUrl, description, title])
}
