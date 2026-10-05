import { notFound } from "next/navigation";
import { guides } from "@/components/resource-sections";
import { IndustryArt, PageIntro } from "@/components/marketing";
import type { Metadata } from "next";
export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = guides.find((guide) => guide.slug === slug);
  return {
    title: guide?.title ?? "Guide",
    description: guide?.description,
    alternates: { canonical: `/knowledge-hub/${slug}` },
  };
}
export default async function Guide({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = guides.find((item) => item.slug === slug);
  if (!guide) notFound();
  return (
    <main className="public-page">
      <PageIntro
        label={guide.category}
        title={guide.title}
        description={guide.description}
      />
      <article className="public-container public-section guide-article">
        <IndustryArt kind={guide.kind} />
        <ol>
          {guide.body.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ol>
        <p className="notice">
          Introductory guide. Follow current official requirements and
          manufacturer instructions for your operation.
        </p>
        <p>
          Reference:{" "}
          <a href={guide.source} target="_blank" rel="noreferrer">
            {guide.sourceLabel} ↗
          </a>
        </p>
      </article>
    </main>
  );
}
