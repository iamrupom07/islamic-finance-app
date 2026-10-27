import React from "react";
import Svg, { Path, Ellipse } from "react-native-svg";

export function GoldBarsIcon({
  size = 22,
  color = "#D97706",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M4 14l2.5-6h3.5l2 6H4z" fill="#FEF3C7" />
      <Path d="M12 14l2-6h3.5l2.5 6h-8z" fill="#FEF3C7" />
      <Path d="M7.5 20l2.5-6h4l2.5 6H7.5z" fill="#FDE68A" />
    </Svg>
  );
}

export function SilverBarsIcon({
  size = 22,
  color = "#64748B",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M4 14l2.5-6h3.5l2 6H4z" fill="#F1F5F9" />
      <Path d="M12 14l2-6h3.5l2.5 6h-8z" fill="#F1F5F9" />
      <Path d="M7.5 20l2.5-6h4l2.5 6H7.5z" fill="#E2E8F0" />
    </Svg>
  );
}

export function CoinsPlantIllustration({
  width = 82,
  height = 82,
}: {
  width?: number;
  height?: number;
}) {
  return (
    <Svg width={width} height={height} viewBox="0 0 80 80" fill="none">
      {/* Coin stack 1 (back left) */}
      <Path
        d="M18 48v16c0 3.866 8.059 7 18 7s18-3.134 18-7V48"
        fill="#A3D4B6"
      />
      <Ellipse cx="36" cy="64" rx="18" ry="7" fill="#B2DDC3" />
      <Ellipse cx="36" cy="56" rx="18" ry="7" fill="#C5E6D3" />
      <Ellipse cx="36" cy="48" rx="18" ry="7" fill="#D8F0E2" />

      {/* Coin stack 2 (front right) */}
      <Path
        d="M42 36v26c0 3.866 8.059 7 18 7s18-3.134 18-7V36"
        fill="#87C7A1"
      />
      <Ellipse cx="60" cy="62" rx="18" ry="7" fill="#99D1B1" />
      <Ellipse cx="60" cy="52" rx="18" ry="7" fill="#ACDBC1" />
      <Ellipse cx="60" cy="44" rx="18" ry="7" fill="#BFE5D1" />
      <Ellipse cx="60" cy="36" rx="18" ry="7" fill="#D6F2E2" />

      {/* Sprout stem */}
      <Path
        d="M60 36c-1-10 1-18 2-24"
        stroke="#409664"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Left Leaf */}
      <Path
        d="M60 25c-6-1-13-6-14-13 6 1 13 5 14 13z"
        fill="#66BC89"
        stroke="#409664"
        strokeWidth="1.2"
      />
      {/* Right Leaf */}
      <Path
        d="M61 20c7-1 14-7 15-14-7 1-14 5-15 14z"
        fill="#82CFA1"
        stroke="#409664"
        strokeWidth="1.2"
      />
    </Svg>
  );
}
