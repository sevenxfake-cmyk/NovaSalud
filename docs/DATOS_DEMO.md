# Productos y boletas de presentación

Los primeros ejemplos de la interfaz estaban en memoria. Al pasar a SQL no se importaron automáticamente. La carga persistente solicitada incorpora nueve productos y seis boletas en Turso, manteniendo el Paracetamol MED-001 registrado por el propietario.

## Catálogo académico

Los precios y cantidades de carga son ficticios y sirven para demostrar el sistema. El stock visible será el resultado de restar las ventas y de las ediciones posteriores.

| Código   | Producto               | Precio de carga | Stock inicial | Mínimo |
| -------- | ---------------------- | --------------: | ------------: | -----: |
| DEMO-002 | Amoxicilina 500 mg     |        S/ 32.00 |             8 |     15 |
| DEMO-003 | Ibuprofeno 400 mg      |        S/ 24.00 |            64 |     20 |
| DEMO-004 | Loratadina 10 mg       |        S/ 12.50 |             0 |     10 |
| DEMO-005 | Omeprazol 20 mg        |        S/ 18.00 |             6 |     12 |
| DEMO-006 | Vitamina C 1 g         |        S/ 16.90 |            42 |     10 |
| DEMO-007 | Alcohol medicinal 70°  |         S/ 6.50 |            58 |     15 |
| DEMO-008 | Cetirizina 10 mg       |         S/ 8.50 |             5 |     10 |
| DEMO-009 | Complejo B             |        S/ 28.50 |            35 |     10 |
| DEMO-010 | Sales de rehidratación |         S/ 3.50 |            80 |     20 |

Cada unidad corresponde a la presentación indicada en el producto, no necesariamente a una tableta. Los ejemplos incluyen productos disponibles, de stock bajo y agotados.

## Boletas de demostración

| Número           |    Total |
| ---------------- | -------: |
| DEMO-B001-000001 | S/ 64.90 |
| DEMO-B001-000002 | S/ 26.50 |
| DEMO-B001-000003 | S/ 62.30 |
| DEMO-B001-000004 | S/ 41.50 |
| DEMO-B001-000005 | S/ 41.50 |
| DEMO-B001-000006 | S/ 27.40 |

Se distribuyen entre el día de la carga y los cinco días anteriores. Sus detalles conservan los precios de ese momento. Descuentan únicamente productos del catálogo DEMO mediante transacciones. No se inventan RUC, DNI ni datos de clientes.

En Historial, abrir el número o el botón de detalle y seleccionar **Imprimir boleta**. El navegador permite imprimir o guardar como PDF según sus opciones. La advertencia **EJEMPLO ACADÉMICO · SIN VALIDEZ FISCAL** se conserva en la impresión.

## Repetir la carga

```powershell
npm.cmd run db:seed-demo
```

El comando utiliza códigos y claves estables. Si los ejemplos ya existen, no duplica las ventas ni repone sus existencias. Tampoco sobrescribe los cambios posteriores de precio o stock. Si un código reservado pertenece a un producto manual, rechaza esa colisión en lugar de modificarlo.

La carga no se ejecuta automáticamente en un despliegue, una recarga de página ni una prueba. Los ejemplos permanecen en Turso para la presentación. Las cuentas y registros temporales de los scripts `test:remote` y `test:public` pertenecen a otro conjunto y se retiran independientemente.
