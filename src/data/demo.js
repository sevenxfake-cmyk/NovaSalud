export const demoProducts = [
  {
    id: "p1",
    code: "MED-001",
    name: "Paracetamol 500 mg",
    category: "Analgésicos",
    presentation: "Caja · 100 tabletas",
    price: 1500,
    stock: 120,
    minStock: 20,
  },
  {
    id: "p2",
    code: "MED-002",
    name: "Amoxicilina 500 mg",
    category: "Antibióticos",
    presentation: "Caja · 100 cápsulas",
    price: 3200,
    stock: 8,
    minStock: 15,
  },
  {
    id: "p3",
    code: "MED-003",
    name: "Ibuprofeno 400 mg",
    category: "Analgésicos",
    presentation: "Caja · 100 tabletas",
    price: 2400,
    stock: 64,
    minStock: 20,
  },
  {
    id: "p4",
    code: "MED-004",
    name: "Loratadina 10 mg",
    category: "Antialérgicos",
    presentation: "Caja · 30 tabletas",
    price: 1250,
    stock: 0,
    minStock: 10,
  },
  {
    id: "p5",
    code: "MED-005",
    name: "Omeprazol 20 mg",
    category: "Gastrointestinales",
    presentation: "Caja · 30 cápsulas",
    price: 1800,
    stock: 6,
    minStock: 12,
  },
  {
    id: "p6",
    code: "MED-006",
    name: "Vitamina C 1 g",
    category: "Vitaminas",
    presentation: "Tubo · 10 efervescentes",
    price: 1690,
    stock: 42,
    minStock: 10,
  },
  {
    id: "p7",
    code: "MED-007",
    name: "Alcohol medicinal 70°",
    category: "Cuidado personal",
    presentation: "Frasco · 250 ml",
    price: 650,
    stock: 58,
    minStock: 15,
  },
  {
    id: "p8",
    code: "MED-008",
    name: "Cetirizina 10 mg",
    category: "Antialérgicos",
    presentation: "Caja · 10 tabletas",
    price: 850,
    stock: 5,
    minStock: 10,
  },
  {
    id: "p9",
    code: "MED-009",
    name: "Complejo B",
    category: "Vitaminas",
    presentation: "Frasco · 100 tabletas",
    price: 2850,
    stock: 35,
    minStock: 10,
  },
  {
    id: "p10",
    code: "MED-010",
    name: "Sales de rehidratación",
    category: "Gastrointestinales",
    presentation: "Sobre · 27.9 g",
    price: 350,
    stock: 80,
    minStock: 20,
  },
];

// Datos ficticios para recorrer la interfaz. El stock inicial es independiente
// de estas ventas de ejemplo; solo las ventas nuevas descuentan existencias.
export function createDemoSales(now = new Date()) {
  return Array.from({ length: 18 }, (_, index) => {
    const product = demoProducts[[0, 2, 5, 6, 8, 9][index % 6]];
    const quantity = (index % 3) + 1;
    const date = new Date(
      now.getTime() - Math.floor(index / 3) * 86400000 - (index % 3) * 3600000,
    );
    return {
      id: `DEMO-${String(18 - index).padStart(4, "0")}`,
      date: date.toISOString(),
      total: product.price * quantity,
      items: [
        {
          productId: product.id,
          name: product.name,
          code: product.code,
          quantity,
          price: product.price,
          subtotal: product.price * quantity,
        },
      ],
      payment: index % 2 ? "Yape / Plin" : "Efectivo",
      demo: true,
    };
  });
}
