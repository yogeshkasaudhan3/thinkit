import { useState } from "react";

// ─── Data ────────────────────────────────────────────────────────────────────

const SUBCATEGORIES = [
  { id: "all",   name: "All",        color: "#F0FDF4", icon: "🌾" },
  { id: "atta",  name: "Whole\nWheat Atta", color: "#FEF9C3", icon: "🌽" },
  { id: "maida", name: "Maida",      color: "#FFF7ED", icon: "🥣" },
  { id: "besan", name: "Besan",      color: "#FEF3C7", icon: "🫘" },
  { id: "suji",  name: "Suji &\nRava",     color: "#F0FDF4", icon: "🌾" },
  { id: "ragi",  name: "Ragi\nFlour",      color: "#FDF4FF", icon: "🌿" },
  { id: "jowar", name: "Jowar\nFlour",     color: "#FFF1F2", icon: "🌾" },
  { id: "rice",  name: "Rice\nFlour",      color: "#F0F9FF", icon: "🍚" },
  { id: "multi", name: "Multigrain",  color: "#FAFAF9", icon: "🌻" },
];

const PRODUCTS: Record<string, Product[]> = {
  all: [
    { id: 1,  name: "Aashirvaad Select Whole Wheat Atta",  weight: "5 kg",  price: 265, mrp: 295, img: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=200&h=200&fit=crop&auto=format", badge: "BEST SELLER" },
    { id: 2,  name: "Fortune Chakki Fresh Atta",            weight: "10 kg", price: 498, mrp: 549, img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop&auto=format", badge: "" },
    { id: 3,  name: "Rajdhani Besan",                       weight: "500 g", price: 62,  mrp: 72,  img: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop&auto=format", badge: "14% OFF" },
    { id: 4,  name: "Pillsbury Maida",                      weight: "1 kg",  price: 49,  mrp: 58,  img: "https://images.unsplash.com/photo-1565687981296-535f09db714e?w=200&h=200&fit=crop&auto=format", badge: "" },
    { id: 5,  name: "MTR Ragi Flour",                       weight: "500 g", price: 55,  mrp: 65,  img: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=200&h=200&fit=crop&auto=format", badge: "15% OFF" },
    { id: 6,  name: "Aashirvaad Suji/Rawa",                 weight: "1 kg",  price: 42,  mrp: 50,  img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop&auto=format", badge: "" },
  ],
  atta: [
    { id: 1,  name: "Aashirvaad Select Whole Wheat Atta",  weight: "5 kg",  price: 265, mrp: 295, img: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=200&h=200&fit=crop&auto=format", badge: "BEST SELLER" },
    { id: 2,  name: "Fortune Chakki Fresh Atta",            weight: "10 kg", price: 498, mrp: 549, img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop&auto=format", badge: "" },
    { id: 7,  name: "Patanjali Whole Wheat Atta",           weight: "5 kg",  price: 199, mrp: 225, img: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=200&h=200&fit=crop&auto=format", badge: "11% OFF" },
    { id: 8,  name: "Sujata Chakki Gold Atta",              weight: "2 kg",  price: 110, mrp: 125, img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop&auto=format", badge: "" },
  ],
  maida: [
    { id: 4,  name: "Pillsbury Maida",                      weight: "1 kg",  price: 49,  mrp: 58,  img: "https://images.unsplash.com/photo-1565687981296-535f09db714e?w=200&h=200&fit=crop&auto=format", badge: "" },
    { id: 9,  name: "Rajdhani Maida",                       weight: "1 kg",  price: 44,  mrp: 52,  img: "https://images.unsplash.com/photo-1565687981296-535f09db714e?w=200&h=200&fit=crop&auto=format", badge: "15% OFF" },
  ],
  besan: [
    { id: 3,  name: "Rajdhani Besan",                       weight: "500 g", price: 62,  mrp: 72,  img: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop&auto=format", badge: "14% OFF" },
    { id: 10, name: "Haldiram Besan",                       weight: "500 g", price: 68,  mrp: 79,  img: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop&auto=format", badge: "" },
  ],
  suji: [
    { id: 6,  name: "Aashirvaad Suji/Rawa",                 weight: "1 kg",  price: 42,  mrp: 50,  img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop&auto=format", badge: "" },
    { id: 11, name: "Fortune Suji",                          weight: "1 kg",  price: 39,  mrp: 46,  img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop&auto=format", badge: "" },
  ],
  ragi: [
    { id: 5,  name: "MTR Ragi Flour",                       weight: "500 g", price: 55,  mrp: 65,  img: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=200&h=200&fit=crop&auto=format", badge: "15% OFF" },
  ],
  jowar: [],
  rice: [
    { id: 12, name: "24 Mantra Rice Flour",                  weight: "500 g", price: 48,  mrp: 56,  img: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop&auto=format", badge: "" },
  ],
  multi: [
    { id: 13, name: "Saffola Multigrain Atta",               weight: "5 kg",  price: 379, mrp: 420, img: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=200&h=200&fit=crop&auto=format", badge: "10% OFF" },
  ],
};

interface Product {
  id: number;
  name: string;
  weight: string;
  price: number;
  mrp: number;
  img: string;
  badge: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SidebarItem({
  sub,
  isActive,
  onClick,
}: {
  sub: (typeof SUBCATEGORIES)[0];
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        padding: "10px 4px",
        gap: 5,
        background: isActive ? "#F0FDF4" : "#FAFAFA",
        borderLeft: isActive ? "3px solid #16A34A" : "3px solid transparent",
        border: "none",
        cursor: "pointer",
        position: "relative",
        transition: "background 0.15s",
      }}
    >
      {/* Icon bubble */}
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 12,
          background: sub.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          boxShadow: isActive ? "0 1px 6px rgba(22,163,74,0.18)" : "0 1px 4px rgba(0,0,0,0.06)",
          border: isActive ? "1.5px solid #bbf7d0" : "1.5px solid #e5e7eb",
          flexShrink: 0,
        }}
      >
        {sub.icon}
      </div>

      {/* Name */}
      <span
        style={{
          fontSize: 9.5,
          fontWeight: isActive ? 700 : 500,
          color: isActive ? "#16A34A" : "#4B5563",
          textAlign: "center",
          lineHeight: 1.25,
          whiteSpace: "pre-line",
          width: "100%",
          wordBreak: "break-word",
        }}
      >
        {sub.name}
      </span>
    </button>
  );
}

function ProductCard({ product }: { product: Product }) {
  const [inCart, setInCart] = useState(false);
  const discount = Math.round(((product.mrp - product.price) / product.mrp) * 100);

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
        display: "flex",
        flexDirection: "column",
        border: "1px solid #F3F4F6",
        position: "relative",
      }}
    >
      {/* Badge */}
      {product.badge && (
        <div
          style={{
            position: "absolute",
            top: 6,
            left: 6,
            background: "#16A34A",
            color: "#fff",
            fontSize: 7.5,
            fontWeight: 700,
            padding: "2px 5px",
            borderRadius: 4,
            letterSpacing: 0.3,
            zIndex: 1,
          }}
        >
          {product.badge}
        </div>
      )}

      {/* Image */}
      <div style={{ background: "#F9FAFB", aspectRatio: "1", overflow: "hidden" }}>
        <img
          src={product.img}
          alt={product.name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23F3F4F6' width='200' height='200'/%3E%3Ctext fill='%239CA3AF' font-size='48' font-family='sans-serif' x='100' y='110' text-anchor='middle'%3E🌾%3C/text%3E%3C/svg%3E";
          }}
        />
      </div>

      {/* Details */}
      <div style={{ padding: "8px 8px 10px", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "#111827",
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {product.name}
        </span>
        <span style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 400 }}>{product.weight}</span>

        {/* Price row + Add button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 4 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>₹{product.price}</span>
            {discount > 0 && (
              <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                <span style={{ fontSize: 9, color: "#9CA3AF", textDecoration: "line-through" }}>₹{product.mrp}</span>
                <span style={{ fontSize: 9, color: "#16A34A", fontWeight: 600 }}>{discount}% off</span>
              </div>
            )}
          </div>

          <button
            onClick={() => setInCart((v) => !v)}
            style={{
              background: inCart ? "#16A34A" : "#fff",
              color: inCart ? "#fff" : "#16A34A",
              border: "1.5px solid #16A34A",
              borderRadius: 8,
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s",
              minWidth: 36,
            }}
          >
            {inCart ? "✓" : "+"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BlinkitLayout() {
  const [activeId, setActiveId] = useState("all");
  const products = PRODUCTS[activeId] ?? [];

  return (
    <div
      style={{
        width: 390,
        height: 844,
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          height: 52,
          background: "#fff",
          borderBottom: "1px solid #E5E7EB",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 10,
          flexShrink: 0,
          zIndex: 10,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "#F3F4F6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          ←
        </div>
        <span style={{ fontWeight: 700, fontSize: 16, color: "#111827", flex: 1 }}>Atta & Flour</span>
        <div style={{ fontSize: 18, cursor: "pointer" }}>🔍</div>
      </div>

      {/* ── Body: Sidebar + Products ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Left Sidebar ── */}
        <div
          style={{
            width: 90,
            flexShrink: 0,
            background: "#FAFAFA",
            borderRight: "1px solid #E5E7EB",
            overflowY: "auto",
            overflowX: "hidden",
            scrollbarWidth: "none",
          }}
        >
          {SUBCATEGORIES.map((sub) => (
            <SidebarItem
              key={sub.id}
              sub={sub}
              isActive={activeId === sub.id}
              onClick={() => setActiveId(sub.id)}
            />
          ))}
        </div>

        {/* ── Right Products Area ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            background: "#F9FAFB",
            scrollbarWidth: "none",
          }}
        >
          {/* Section header */}
          <div
            style={{
              padding: "12px 12px 8px",
              background: "#fff",
              borderBottom: "1px solid #F3F4F6",
              position: "sticky",
              top: 0,
              zIndex: 5,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>
              {SUBCATEGORIES.find((s) => s.id === activeId)?.name.replace("\n", " ")}
            </span>
            <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: 6 }}>
              {products.length} items
            </span>
          </div>

          {/* Grid */}
          <div style={{ padding: "10px 8px", paddingBottom: 80 }}>
            {products.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 200,
                  color: "#9CA3AF",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 32 }}>📦</span>
                <span style={{ fontSize: 13 }}>No products in this section</span>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Nav ── */}
      <div
        style={{
          height: 60,
          background: "#fff",
          borderTop: "1px solid #E5E7EB",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          flexShrink: 0,
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          boxShadow: "0 -2px 8px rgba(0,0,0,0.06)",
        }}
      >
        {[
          { icon: "🏠", label: "Home" },
          { icon: "📦", label: "Orders" },
          { icon: "🛒", label: "Cart", active: true },
          { icon: "👤", label: "Profile" },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span
              style={{
                fontSize: 9,
                fontWeight: item.active ? 700 : 400,
                color: item.active ? "#16A34A" : "#9CA3AF",
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
