import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "../../client/components/ui/card";
import { cn } from "../../client/utils";
import { useI18n } from "../../i18n";
import { Feature } from "./Features";
import { SectionTitle } from "./SectionTitle";

export interface GridFeature extends Omit<Feature, "icon"> {
  icon?: React.ReactNode;
  emoji?: string;
  direction?: "col" | "row" | "col-reverse" | "row-reverse";
  align?: "center" | "left";
  size: "small" | "medium" | "large";
  fullWidthIcon?: boolean;
}

interface FeaturesGridProps {
  features: GridFeature[];
  className?: string;
}

export function FeaturesGrid({ features, className = "" }: FeaturesGridProps) {
  const { t } = useI18n();

  return (
    <div
      className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-20 sm:py-24 lg:px-8"
      id="features"
    >
      <SectionTitle
        title={t("landing.features.title")}
        description={t("landing.features.description")}
      />
      <div
        className={cn(
          "mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
          className,
        )}
      >
        {features.map((feature) => (
          <FeaturesGridItem
            key={feature.name + feature.description}
            {...feature}
          />
        ))}
      </div>
    </div>
  );
}

function FeaturesGridItem({
  name,
  description,
  icon,
  emoji,
  href,
  direction = "col",
  align = "center",
  size = "medium",
  fullWidthIcon = true,
}: GridFeature) {
  const gridFeatureSizeToClasses: Record<GridFeature["size"], string> = {
    small: "",
    medium: "",
    large: "",
  };

  const directionToClass: Record<
    NonNullable<GridFeature["direction"]>,
    string
  > = {
    col: "flex-col",
    row: "flex-row",
    "row-reverse": "flex-row-reverse",
    "col-reverse": "flex-col-reverse",
  };

  const gridFeatureCard = (
    <Card
      className={cn(
        "h-full min-h-48 bg-card transition-colors hover:border-primary/40",
        gridFeatureSizeToClasses[size],
      )}
      variant="default"
    >
      <CardContent className="flex h-full flex-col items-start justify-start p-6">
        {fullWidthIcon && (icon || emoji) ? (
          <div className="mb-5 flex w-full items-center justify-start text-primary">
            {icon ? (
              icon
            ) : emoji ? (
              <span className="text-3xl">{emoji}</span>
            ) : null}
          </div>
        ) : (
          <div
            className={cn(
              "flex items-center gap-3",
              directionToClass[direction],
              align === "center"
                ? "items-center justify-center"
                : "justify-start",
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-primary">
              {icon ? (
                icon
              ) : emoji ? (
                <span className="text-2xl">{emoji}</span>
              ) : null}
            </div>
            <CardTitle
              className={cn(align === "center" ? "text-center" : "text-left")}
            >
              {name}
            </CardTitle>
          </div>
        )}
        {fullWidthIcon && (icon || emoji) && (
          <CardTitle className="mb-2 text-left text-base leading-6">{name}</CardTitle>
        )}
        <CardDescription
          className={cn(
            "text-sm leading-6",
            fullWidthIcon || direction === "col" || align === "center"
              ? "text-left"
              : "text-left",
          )}
        >
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <a
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
        className={gridFeatureSizeToClasses[size]}
      >
        {gridFeatureCard}
      </a>
    );
  }

  return gridFeatureCard;
}
