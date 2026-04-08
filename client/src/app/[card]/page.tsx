import { notFound } from "next/navigation";
import CardPage from "@/components/CardPage/CardPage";
import cardAssets from "@/cardAssets";

export const dynamicParams = false;

type CardRouteProps = {
  params: Promise<{
    card: string;
  }>;
};

export function generateStaticParams() {
  return Object.keys(cardAssets).map((card) => ({ card }));
}

export default async function CardRoutePage({ params }: CardRouteProps) {
  const { card } = await params;

  if (!cardAssets[card as keyof typeof cardAssets]) {
    notFound();
  }

  return <CardPage card={card} />;
}
