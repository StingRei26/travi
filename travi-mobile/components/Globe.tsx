import { useEffect, useRef, useState } from "react";
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  PanResponder, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_W } = Dimensions.get("window");
const GLOBE_SIZE = Math.min(SCREEN_W - 48, 320);
const CX = GLOBE_SIZE / 2;
const CY = GLOBE_SIZE / 2;
const R = GLOBE_SIZE * 0.44;

export type City = { name: string; country: string; flag: string; lat: number; lon: number };

export const CITIES: City[] = [
  { name: "Tokyo",        country: "Japan",         flag: "🇯🇵", lat: 35.7,  lon: 139.7  },
  { name: "Paris",        country: "France",        flag: "🇫🇷", lat: 48.9,  lon: 2.3    },
  { name: "New York",     country: "USA",           flag: "🇺🇸", lat: 40.7,  lon: -74.0  },
  { name: "London",       country: "UK",            flag: "🇬🇧", lat: 51.5,  lon: -0.1   },
  { name: "Sydney",       country: "Australia",     flag: "🇦🇺", lat: -33.9, lon: 151.2  },
  { name: "Dubai",        country: "UAE",           flag: "🇦🇪", lat: 25.2,  lon: 55.3   },
  { name: "Rome",         country: "Italy",         flag: "🇮🇹", lat: 41.9,  lon: 12.5   },
  { name: "Bangkok",      country: "Thailand",      flag: "🇹🇭", lat: 13.8,  lon: 100.5  },
  { name: "Barcelona",    country: "Spain",         flag: "🇪🇸", lat: 41.4,  lon: 2.2    },
  { name: "Bali",         country: "Indonesia",     flag: "🇮🇩", lat: -8.4,  lon: 115.2  },
  { name: "Lisbon",       country: "Portugal",      flag: "🇵🇹", lat: 38.7,  lon: -9.1   },
  { name: "Singapore",    country: "Singapore",     flag: "🇸🇬", lat: 1.3,   lon: 103.8  },
  { name: "Santorini",    country: "Greece",        flag: "🇬🇷", lat: 36.4,  lon: 25.4   },
  { name: "Marrakech",    country: "Morocco",       flag: "🇲🇦", lat: 31.6,  lon: -8.0   },
  { name: "Kyoto",        country: "Japan",         flag: "🇯🇵", lat: 35.0,  lon: 135.8  },
  { name: "Cape Town",    country: "South Africa",  flag: "🇿🇦", lat: -33.9, lon: 18.4   },
  { name: "Seoul",        country: "South Korea",   flag: "🇰🇷", lat: 37.6,  lon: 127.0  },
  { name: "Istanbul",     country: "Turkey",        flag: "🇹🇷", lat: 41.0,  lon: 28.9   },
  { name: "Amsterdam",    country: "Netherlands",   flag: "🇳🇱", lat: 52.4,  lon: 4.9    },
  { name: "Buenos Aires", country: "Argentina",     flag: "🇦🇷", lat: -34.6, lon: -58.4  },
  { name: "Cancún",       country: "Mexico",        flag: "🇲🇽", lat: 21.2,  lon: -86.8  },
  { name: "Manila",       country: "Philippines",   flag: "🇵🇭", lat: 14.6,  lon: 121.0  },
  { name: "Vancouver",    country: "Canada",        flag: "🇨🇦", lat: 49.3,  lon: -123.1 },
  { name: "Nairobi",      country: "Kenya",         flag: "🇰🇪", lat: -1.3,  lon: 36.8   },
  { name: "Mumbai",       country: "India",         flag: "🇮🇳", lat: 19.1,  lon: 72.9   },
];

const STARS = Array.from({ length: 50 }, (_, i) => ({
  key: `s${i}`,
  x: Math.random() * (GLOBE_SIZE + 80) - 40,
  y: Math.random() * (GLOBE_SIZE + 80) - 40,
  r: Math.random() * 1.1 + 0.3,
  o: Math.random() * 0.45 + 0.15,
}));

function project(lat: number, lon: number, lonOffset: number) {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = ((lon + lonOffset) * Math.PI) / 180;
  const x = R * Math.cos(latRad) * Math.sin(lonRad);
  const y = -R * Math.sin(latRad);
  const z = R * Math.cos(latRad) * Math.cos(lonRad);
  if (z < 0) return null;
  return { x: CX + x, y: CY + y, z };
}

function textureOffset(lonOffset: number): number {
  const normalized = ((lonOffset % 360) + 360) % 360;
  return (normalized / 360) * GLOBE_SIZE;
}

interface Props {
  onCitySelect: (city: City) => void;
  selectedCity?: City | null;
}

export default function Globe({ onCitySelect, selectedCity }: Props) {
  const [lonOffset, setLonOffset] = useState(0);
  const lonRef = useRef(0);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let frame = 0;
    const id = setInterval(() => {
      if (!dragging.current) {
        lonRef.current = (lonRef.current + 0.25) % 360;
        setLonOffset(lonRef.current);
      }
      frame++;
      setTick(frame);
    }, 33);
    return () => clearInterval(id);
  }, []);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      dragging.current = true;
      lastX.current = e.nativeEvent.locationX;
    },
    onPanResponderMove: (e) => {
      const dx = e.nativeEvent.locationX - lastX.current;
      lastX.current = e.nativeEvent.locationX;
      lonRef.current = (lonRef.current + dx * 0.5) % 360;
      setLonOffset(lonRef.current);
    },
    onPanResponderRelease: () => { dragging.current = false; },
  });

  const imgShift = textureOffset(lonOffset);
  const img1Left = -imgShift;
  const img2Left = GLOBE_SIZE - imgShift;

  const visibleCities = CITIES
    .map(city => {
      const p = project(city.lat, city.lon, lonOffset);
      return p ? { city, ...p } : null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => a.z - b.z);

  const pulseScale = 1 + 0.28 * Math.sin(tick * 0.12);
  const pulseOpacity = 0.25 + 0.25 * Math.sin(tick * 0.1);

  return (
    <View style={styles.wrapper}>
      {/* Stars */}
      <View style={styles.stars} pointerEvents="none">
        {STARS.map(s => (
          <View
            key={s.key}
            style={{
              position: "absolute",
              left: s.x, top: s.y,
              width: s.r * 2, height: s.r * 2,
              borderRadius: s.r,
              backgroundColor: "#fff",
              opacity: s.o,
            }}
          />
        ))}
      </View>

      {/* Globe — single circle, no extra rings */}
      <View style={styles.globe} {...panResponder.panHandlers}>
        {/* Earth texture — two tiles for seamless scroll */}
        <Image
          source={require("../assets/earth.jpg")}
          style={[styles.earthImg, { left: img1Left }]}
          resizeMode="stretch"
        />
        <Image
          source={require("../assets/earth.jpg")}
          style={[styles.earthImg, { left: img2Left }]}
          resizeMode="stretch"
        />

        {/* City dots */}
        {visibleCities.map(({ city, x, y, z }) => {
          const depth = z / R;
          const isSelected = selectedCity?.name === city.name;
          const size = isSelected ? 11 : 7;
          return (
            <TouchableOpacity
              key={city.name}
              style={[
                styles.cityDot,
                {
                  left: x - size / 2,
                  top: y - size / 2,
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: isSelected ? "#c9a84c" : "#ffffff",
                  opacity: isSelected ? 1 : 0.6 + depth * 0.4,
                  zIndex: Math.round(z + R) + 10,
                  borderWidth: isSelected ? 0 : 1,
                  borderColor: "rgba(0,0,0,0.3)",
                },
              ]}
              onPress={() => onCitySelect(city)}
              activeOpacity={0.75}
            />
          );
        })}

        {/* Pulsing glow ring for selected city */}
        {visibleCities
          .filter(c => c.city.name === selectedCity?.name)
          .map(({ city, x, y, z }) => {
            const ringSize = 26 * pulseScale;
            return (
              <View
                key={`glow-${city.name}`}
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: x - ringSize / 2,
                  top: y - ringSize / 2,
                  width: ringSize,
                  height: ringSize,
                  borderRadius: ringSize / 2,
                  borderWidth: 1.5,
                  borderColor: `rgba(201,168,76,${pulseOpacity})`,
                  backgroundColor: "rgba(201,168,76,0.12)",
                  zIndex: Math.round(z + R) + 9,
                }}
              />
            );
          })}

        {/* Labels for front-facing cities */}
        {visibleCities.map(({ city, x, y, z }) => {
          const isSelected = selectedCity?.name === city.name;
          if (!isSelected && (z / R) < 0.75) return null;
          return (
            <TouchableOpacity
              key={`lbl-${city.name}`}
              style={[
                styles.label,
                isSelected && styles.labelSelected,
                { left: x + 9, top: y - 9, zIndex: Math.round(z + R) + 20 },
              ]}
              onPress={() => onCitySelect(city)}
              activeOpacity={0.7}
            >
              <Text style={[styles.labelText, isSelected && styles.labelTextSelected]}>
                {city.flag} {city.name}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Directional light: lit top-left, shadow bottom-right */}
        <LinearGradient
          colors={["rgba(255,255,255,0.07)", "transparent", "rgba(0,0,0,0.35)"]}
          start={{ x: 0.1, y: 0.05 }}
          end={{ x: 0.95, y: 0.95 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />

        {/* Specular highlight top-left */}
        <LinearGradient
          colors={["rgba(200,230,255,0.1)", "transparent"]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.55, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
      </View>

      <Text style={styles.hint}>Tap a city · drag to spin</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    paddingVertical: 8,
  },
  stars: {
    position: "absolute",
    width: GLOBE_SIZE + 80,
    height: GLOBE_SIZE + 80,
    top: -4,
    left: -40,
  },
  globe: {
    width: GLOBE_SIZE,
    height: GLOBE_SIZE,
    borderRadius: GLOBE_SIZE / 2,
    backgroundColor: "#0a1a35",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.18)",
    shadowColor: "#2060a0",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 8,
  },
  earthImg: {
    position: "absolute",
    top: 0,
    width: GLOBE_SIZE,
    height: GLOBE_SIZE,
  },
  cityDot: {
    position: "absolute",
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 3,
  },
  label: {
    position: "absolute",
    paddingHorizontal: 5,
    paddingVertical: 2,
    backgroundColor: "rgba(0,10,25,0.72)",
    borderRadius: 5,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.15)",
  },
  labelSelected: {
    backgroundColor: "rgba(201,168,76,0.18)",
    borderColor: "rgba(201,168,76,0.55)",
  },
  labelText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 10,
    fontWeight: "600",
  },
  labelTextSelected: {
    color: "#e8c96a",
    fontWeight: "800",
  },
  hint: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 12,
    marginTop: 10,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
});
