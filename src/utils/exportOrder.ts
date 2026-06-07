import { saveAs } from 'file-saver';
import type { OrderItem } from '../db/types';

function fileTimestamp() {
  return new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
}

export async function exportOrderToPdf(items: OrderItem[]) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('Pedido de Reposição', 14, 16);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 23);

  autoTable(doc, {
    startY: 28,
    head: [['Produto', 'Categoria', 'Ideal', 'Atual', 'A pedir']],
    body: items.map((item) => [
      item.productName,
      item.categoryName,
      String(item.idealQuantity),
      String(item.countedQuantity),
      String(item.quantityToOrder),
    ]),
  });

  doc.save(`pedido-reposicao-${fileTimestamp()}.pdf`);
}

export async function exportOrderToExcel(items: OrderItem[]) {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet('Pedido');

  sheet.columns = [
    { header: 'Produto', key: 'productName', width: 32 },
    { header: 'Categoria', key: 'categoryName', width: 20 },
    { header: 'Quantidade ideal', key: 'idealQuantity', width: 16 },
    { header: 'Quantidade atual', key: 'countedQuantity', width: 16 },
    { header: 'Quantidade a pedir', key: 'quantityToOrder', width: 18 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const item of items) {
    sheet.addRow({
      productName: item.productName,
      categoryName: item.categoryName,
      idealQuantity: item.idealQuantity,
      countedQuantity: item.countedQuantity,
      quantityToOrder: item.quantityToOrder,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `pedido-reposicao-${fileTimestamp()}.xlsx`);
}

export function buildWhatsAppMessage(items: OrderItem[]): string {
  const lines = [
    '*Pedido de Reposição*',
    `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
    '',
    ...items.map((item) => `• ${item.productName}: ${item.quantityToOrder} ${item.categoryName ? `(${item.categoryName})` : ''}`.trim()),
  ];
  return lines.join('\n');
}

export function shareOnWhatsApp(items: OrderItem[]) {
  const text = buildWhatsAppMessage(items);
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
