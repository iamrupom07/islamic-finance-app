import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Rect, Circle, G, Defs, LinearGradient, Stop } from "react-native-svg";

/**
 * Amanah brand logo badge (emerald rounded squircle with crescent moon & coin)
 */
export function AmanahLogoBadge({ size = 38 }: { size?: number }) {
  const iconSize = Math.round(size * 0.62);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        backgroundColor: "#0D654E",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#0D654E",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
        {/* Crescent moon in mint */}
        <Path
          d="M14 3.5C9.85 4.5 6.8 8.2 6.8 12.6C6.8 17.5 10.7 21.5 15.6 21.5C18.2 21.5 20.5 20.4 22 18.6C15.8 19.8 10.5 14.8 11.2 8.6C11.6 5.8 12.8 4.2 14 3.5Z"
          fill="#8EE2C1"
        />
        {/* Golden Coin overlapping the crescent */}
        <Circle cx="16" cy="14.5" r="4.2" fill="#FBBF24" stroke="#0D654E" strokeWidth="1" />
        <Path
          d="M16 12.2V16.8M14 14.5H18"
          stroke="#92400E"
          strokeWidth="0.8"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

/**
 * Official Google multi-color G icon
 */
export function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </Svg>
  );
}

/**
 * Slide 1: Mihrab arch with crescent, stars, 2 floating cards (Salary, Groceries), stack of coins with star rosette
 */
export function Slide1Illustration() {
  return (
    <View style={styles.archContainer}>
      {/* Background Arch SVG */}
      <Svg width="310" height="300" viewBox="0 0 310 300" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="archFill1" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#EAF5F0" />
            <Stop offset="100%" stopColor="#E0EFE8" />
          </LinearGradient>
        </Defs>

        {/* Outer Mihrab Arch */}
        <Path
          d="M 25,300 L 25,125 C 25,58 105,38 155,10 C 205,38 285,58 285,125 L 285,300 Z"
          fill="url(#archFill1)"
        />
        {/* Decorative inner arch outline */}
        <Path
          d="M 40,300 L 40,135 C 40,78 110,60 155,35 C 200,60 270,78 270,135 L 270,300"
          stroke="#CEE6DC"
          strokeWidth="1.2"
          fill="none"
        />

        {/* Crescent Moon */}
        <Path
          d="M 168,48 C 152,53 140,70 143,89 C 146,108 163,120 181,117 C 166,121 149,111 145,96 C 141,80 151,61 168,48 Z"
          fill="#0F6E56"
        />

        {/* 4-pointed Sparkle Stars */}
        <Path
          d="M 115,70 Q 115,75 120,75 Q 115,75 115,80 Q 115,75 110,75 Q 115,75 115,70 Z"
          fill="#0F6E56"
        />
        <Path
          d="M 205,62 Q 205,66 209,66 Q 205,66 205,70 Q 205,66 201,66 Q 205,66 205,62 Z"
          fill="#0F6E56"
        />

        {/* Coin Stack at the bottom */}
        {/* Layer 1 (bottom) */}
        <Rect x="85" y="275" width="95" height="15" rx="7.5" fill="#DCEDE5" stroke="#71A896" strokeWidth="1.2" />
        {/* Layer 2 */}
        <Rect x="85" y="263" width="95" height="15" rx="7.5" fill="#E2F1EA" stroke="#71A896" strokeWidth="1.2" />
        {/* Layer 3 */}
        <Rect x="85" y="251" width="95" height="15" rx="7.5" fill="#E8F5EF" stroke="#71A896" strokeWidth="1.2" />

        {/* Tilted Front Coin with 12-petaled Rosette */}
        <Circle cx="210" cy="256" r="34" fill="#EDF8F3" stroke="#0F6E56" strokeWidth="1.8" />
        <Circle cx="210" cy="256" r="30" stroke="#71A896" strokeWidth="1" strokeDasharray="2,2" fill="none" />
        {/* 12-petal star rosette in center */}
        <Path
          d="M 210,236 L 213,248 L 225,243 L 219,253 L 230,256 L 219,259 L 225,269 L 213,264 L 210,276 L 207,264 L 195,269 L 201,259 L 190,256 L 201,253 L 195,243 L 207,248 Z"
          fill="#BCE0D4"
          stroke="#0F6E56"
          strokeWidth="0.8"
        />
        <Circle cx="210" cy="256" r="5" fill="#0F6E56" />

        {/* Mint Green Botanical Leaves */}
        {/* Left leaves */}
        <Path
          d="M 85,270 C 65,260 55,240 60,225 C 72,235 78,255 85,270 Z"
          fill="#86C4B1"
          opacity="0.85"
        />
        <Path
          d="M 75,275 C 50,270 40,250 48,238 C 58,250 68,265 75,275 Z"
          fill="#9ED5C5"
          opacity="0.7"
        />
        {/* Right leaves */}
        <Path
          d="M 235,270 C 255,260 265,240 258,225 C 248,235 240,255 235,270 Z"
          fill="#86C4B1"
          opacity="0.85"
        />
        {/* Ground horizontal line */}
        <Path d="M 25,290 L 285,290" stroke="#94C3B2" strokeWidth="1" />
      </Svg>

      {/* Floating Card 1: Salary */}
      <View style={[styles.floatingCard, styles.salaryCard]}>
        <View style={[styles.iconCircle, { backgroundColor: "#E0F2FE" }]}>
          <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <Path
              d="M7 17L17 7M17 7H9M17 7V15"
              stroke="#0284C7"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.cardTitle}>Salary</Text>
          <Text style={styles.cardSubtitle}>Today, 8:24 AM</Text>
        </View>
        <Text style={[styles.cardAmount, { color: "#007AFF" }]}>+ 2,500</Text>
      </View>

      {/* Floating Card 2: Groceries */}
      <View style={[styles.floatingCard, styles.groceriesCard]}>
        <View style={[styles.iconCircle, { backgroundColor: "#FEE2E2" }]}>
          <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <Path
              d="M7 7L17 17M17 17V9M17 17H9"
              stroke="#EF4444"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.cardTitle}>Groceries</Text>
          <Text style={styles.cardSubtitle}>Today, 1:12 PM</Text>
        </View>
        <Text style={[styles.cardAmount, { color: "#DC2626" }]}>- 120</Text>
      </View>
    </View>
  );
}

/**
 * Slide 2: Mihrab arch with calculator, balance scale, golden coins stack with sprout motif
 */
export function Slide2Illustration() {
  return (
    <View style={styles.archContainer}>
      <Svg width="310" height="300" viewBox="0 0 310 300" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="archFill2" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#EAF5F0" />
            <Stop offset="100%" stopColor="#E0EFE8" />
          </LinearGradient>
        </Defs>

        {/* Mihrab Arch */}
        <Path
          d="M 25,300 L 25,125 C 25,58 105,38 155,10 C 205,38 285,58 285,125 L 285,300 Z"
          fill="url(#archFill2)"
        />
        <Path
          d="M 40,300 L 40,135 C 40,78 110,60 155,35 C 200,60 270,78 270,135 L 270,300"
          stroke="#CEE6DC"
          strokeWidth="1.2"
          fill="none"
        />

        {/* 4-pointed Star in Sky */}
        <Path
          d="M 185,60 Q 185,65 189,65 Q 185,65 185,70 Q 185,65 181,65 Q 185,65 185,60 Z"
          fill="#8AC3B1"
        />

        {/* Mint Calculator on Left */}
        <Rect
          x="55"
          y="90"
          width="92"
          height="136"
          rx="14"
          fill="#E3F4EC"
          stroke="#0F6E56"
          strokeWidth="2.2"
        />
        {/* Screen */}
        <Rect x="67" y="102" width="68" height="26" rx="5" fill="#BFDFD2" />
        {/* Buttons grid 3x4 */}
        {/* Row 1 */}
        <Rect x="67" y="136" width="18" height="15" rx="4" fill="#FFFFFF" />
        <Rect x="92" y="136" width="18" height="15" rx="4" fill="#FFFFFF" />
        <Rect x="117" y="136" width="18" height="15" rx="4" fill="#FFFFFF" />
        {/* Row 2 */}
        <Rect x="67" y="157" width="18" height="15" rx="4" fill="#FFFFFF" />
        <Rect x="92" y="157" width="18" height="15" rx="4" fill="#FFFFFF" />
        <Rect x="117" y="157" width="18" height="15" rx="4" fill="#FFFFFF" />
        {/* Row 3 */}
        <Rect x="67" y="178" width="18" height="15" rx="4" fill="#FFFFFF" />
        <Rect x="92" y="178" width="18" height="15" rx="4" fill="#FFFFFF" />
        <Rect x="117" y="178" width="18" height="15" rx="4" fill="#FFFFFF" />
        {/* Row 4 */}
        <Rect x="67" y="199" width="18" height="15" rx="4" fill="#FFFFFF" />
        <Rect x="92" y="199" width="18" height="15" rx="4" fill="#FFFFFF" />
        {/* Equals Accent Button */}
        <Rect x="117" y="199" width="18" height="15" rx="4" fill="#0F6E56" />

        {/* Balance Scale (Mizan) on Right */}
        {/* Central Stand */}
        <Path d="M 226,105 L 226,220" stroke="#0F6E56" strokeWidth="2.5" strokeLinecap="round" />
        <Circle cx="226" cy="103" r="5" fill="#0F6E56" />
        {/* Base */}
        <Path d="M 210,220 L 242,220" stroke="#0F6E56" strokeWidth="3" strokeLinecap="round" />
        {/* Horizontal Beam */}
        <Path d="M 180,120 L 272,120" stroke="#0F6E56" strokeWidth="2.2" strokeLinecap="round" />
        {/* Left Pan Chains & Pan */}
        <Path d="M 182,120 L 168,160 M 182,120 L 196,160" stroke="#0F6E56" strokeWidth="1" />
        <Path d="M 164,160 C 164,172 200,172 200,160 Z" fill="#CDEAE0" stroke="#0F6E56" strokeWidth="1.5" />
        {/* Right Pan Chains & Pan */}
        <Path d="M 270,120 L 256,160 M 270,120 L 284,160" stroke="#0F6E56" strokeWidth="1" />
        <Path d="M 252,160 C 252,172 288,172 288,160 Z" fill="#CDEAE0" stroke="#0F6E56" strokeWidth="1.5" />

        {/* Golden Coins Stack at Base */}
        <Rect x="150" y="215" width="46" height="10" rx="5" fill="#FBBF24" stroke="#D97706" strokeWidth="1.2" />
        <Rect x="146" y="223" width="54" height="10" rx="5" fill="#FBBF24" stroke="#D97706" strokeWidth="1.2" />
        <Rect x="142" y="231" width="62" height="10" rx="5" fill="#F59E0B" stroke="#D97706" strokeWidth="1.2" />

        {/* Front Tilted Golden Coin with Plant Sprout Motif */}
        <Circle cx="192" cy="236" r="23" fill="#FCD34D" stroke="#D97706" strokeWidth="1.8" />
        <Circle cx="192" cy="236" r="19" stroke="#F59E0B" strokeWidth="0.8" strokeDasharray="2,2" fill="none" />
        {/* Sprout motif */}
        <Path
          d="M 192,246 C 192,237 192,230 192,226 M 192,232 C 185,232 182,227 186,224 C 190,222 192,228 192,232 Z M 192,230 C 199,230 202,225 198,222 C 194,220 192,226 192,230 Z"
          stroke="#92400E"
          strokeWidth="1.2"
          fill="#92400E"
          strokeLinecap="round"
        />

        {/* Mint Leaves around base */}
        <Path
          d="M 52,240 C 35,225 22,200 30,185 C 42,195 48,220 52,240 Z"
          fill="#78BCA8"
          opacity="0.85"
        />
        <Path
          d="M 45,245 C 28,240 18,220 25,208 C 36,218 42,235 45,245 Z"
          fill="#94CEBE"
          opacity="0.7"
        />
        <Path d="M 25,255 L 285,255" stroke="#94C3B2" strokeWidth="1" />
      </Svg>
    </View>
  );
}

/**
 * Slide 3: Mihrab arch with hanging lantern (fanous), Holy Quran book, crescent moon & rising sun
 */
export function Slide3Illustration() {
  return (
    <View style={styles.archContainer}>
      <Svg width="310" height="300" viewBox="0 0 310 300" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="archFill3" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#EAF5F0" />
            <Stop offset="100%" stopColor="#E0EFE8" />
          </LinearGradient>
          <LinearGradient id="lanternGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FEF08A" stopOpacity="0.9" />
            <Stop offset="100%" stopColor="#F59E0B" stopOpacity="0.7" />
          </LinearGradient>
        </Defs>

        {/* Mihrab Arch */}
        <Path
          d="M 25,300 L 25,125 C 25,58 105,38 155,10 C 205,38 285,58 285,125 L 285,300 Z"
          fill="url(#archFill3)"
        />
        <Path
          d="M 40,300 L 40,135 C 40,78 110,60 155,35 C 200,60 270,78 270,135 L 270,300"
          stroke="#CEE6DC"
          strokeWidth="1.2"
          fill="none"
        />

        {/* Rising Sun and Rolling Hills in background */}
        <Path d="M 170,205 C 195,190 230,195 285,215 L 285,260 L 170,260 Z" fill="#D7ECE2" />
        {/* Sun and rays */}
        <Circle cx="240" cy="180" r="16" fill="#FDE68A" />
        <Path
          d="M 240,154 L 240,159 M 240,201 L 240,206 M 214,180 L 219,180 M 261,180 L 266,180 M 222,162 L 226,166 M 254,194 L 258,198 M 222,198 L 226,194 M 254,166 L 258,162"
          stroke="#F59E0B"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Crescent Moon */}
        <Path
          d="M 215,75 C 200,80 190,95 193,112 C 196,128 210,138 226,136 C 212,140 198,131 195,118 C 191,104 200,88 215,75 Z"
          fill="#0F6E56"
        />

        {/* Hanging Lantern (Fanous) on Left */}
        {/* Chain */}
        <Path d="M 120,40 L 120,105" stroke="#0F6E56" strokeWidth="1.8" />
        {/* Top Dome Cap */}
        <Path
          d="M 104,105 C 104,95 136,95 136,105 Z"
          fill="#0F6E56"
        />
        <Circle cx="120" cy="92" r="3.5" fill="#0F6E56" />
        {/* Glass Arched Chamber */}
        <Rect x="100" y="105" width="40" height="52" rx="4" fill="#FFFBEB" stroke="#0F6E56" strokeWidth="2" />
        {/* Lantern decorative struts */}
        <Path d="M 100,105 L 120,157 L 140,105" stroke="#0F6E56" strokeWidth="1" />
        {/* Candle & Glowing Flame */}
        <Circle cx="120" cy="132" r="12" fill="url(#lanternGlow)" opacity="0.5" />
        <Rect x="117" y="132" width="6" height="18" rx="2" fill="#FFFFFF" />
        <Path
          d="M 120,123 C 118,127 118,131 120,132 C 122,131 122,127 120,123 Z"
          fill="#F59E0B"
        />
        {/* Bottom Taper of Lantern */}
        <Path
          d="M 100,157 L 120,175 L 140,157 Z"
          fill="#0F6E56"
        />
        <Circle cx="120" cy="177" r="3" fill="#0F6E56" />

        {/* Holy Quran Book on Right */}
        {/* Book block & pages (side) */}
        <Path
          d="M 160,205 L 225,232 L 235,225 L 170,198 Z"
          fill="#F3F4F6"
          stroke="#0F6E56"
          strokeWidth="1.2"
        />
        {/* Green Leather Cover */}
        <Path
          d="M 155,195 L 220,222 L 238,185 L 173,158 Z"
          fill="#0D5542"
          stroke="#06382B"
          strokeWidth="1.5"
        />
        {/* Gold medallion in center of Quran cover */}
        <Circle cx="196" cy="190" r="11" fill="none" stroke="#FBBF24" strokeWidth="1.2" strokeDasharray="2,1" />
        <Path
          d="M 196,183 L 198,188 L 203,186 L 201,190 L 205,192 L 201,194 L 203,198 L 198,196 L 196,201 L 194,196 L 189,198 L 191,194 L 187,192 L 191,190 L 189,186 L 194,188 Z"
          fill="#FBBF24"
        />
        {/* Bookmark Ribbon hanging out */}
        <Path
          d="M 185,220 C 185,235 180,242 186,248 L 191,244 L 196,248 C 192,240 190,230 190,220 Z"
          fill="#10B981"
        />

        {/* Green Botanical branch on left */}
        <Path
          d="M 65,245 C 50,230 40,205 45,185 C 58,195 62,220 65,245 Z"
          fill="#78BCA8"
          opacity="0.85"
        />
        <Path
          d="M 55,250 C 38,245 28,225 35,212 C 45,222 52,240 55,250 Z"
          fill="#94CEBE"
          opacity="0.7"
        />
        <Path d="M 25,255 L 285,255" stroke="#94C3B2" strokeWidth="1" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  archContainer: {
    width: 310,
    height: 300,
    alignSelf: "center",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  floatingCard: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0F4638",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  salaryCard: {
    top: 86,
    left: 20,
    right: 28,
  },
  groceriesCard: {
    top: 146,
    left: 50,
    right: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: "OutfitMedium",
    color: "#182322",
  },
  cardSubtitle: {
    fontSize: 11,
    fontFamily: "Outfit",
    color: "#7E8E8A",
    marginTop: 1,
  },
  cardAmount: {
    fontSize: 15,
    fontFamily: "OutfitMedium",
  },
});
