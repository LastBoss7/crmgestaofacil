import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sale, SALE_STATUS_LABELS, Profile } from '@/types/database';

interface ExportSale extends Sale {
  sellerName?: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (date: string) => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
};

export const exportToExcel = (
  sales: ExportSale[],
  sellers: Record<string, Profile>,
  filename: string = 'relatorio-vendas'
) => {
  const data = sales.map((sale) => ({
    'Data': formatDate(sale.created_at),
    'CNPJ': sale.cnpj_cliente,
    'Razão Social': sale.razao_social,
    'Nome Fantasia': sale.nome_fantasia || '-',
    'Contato': sale.contato_responsavel || '-',
    'Telefone': sale.telefone_responsavel || '-',
    'Produtos': sale.produtos || '-',
    'Valor Mensal': Number(sale.valor_mensal),
    'Status': SALE_STATUS_LABELS[sale.status],
    'Vendedor': sale.seller_id && sellers[sale.seller_id] ? sellers[sale.seller_id].nome : '-',
    'Motivo Pendência': sale.motivo_pendencia || '-',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, // Data
    { wch: 18 }, // CNPJ
    { wch: 30 }, // Razão Social
    { wch: 25 }, // Nome Fantasia
    { wch: 20 }, // Contato
    { wch: 15 }, // Telefone
    { wch: 30 }, // Produtos
    { wch: 15 }, // Valor Mensal
    { wch: 12 }, // Status
    { wch: 20 }, // Vendedor
    { wch: 30 }, // Motivo Pendência
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Vendas');
  
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportToPDF = (
  sales: ExportSale[],
  sellers: Record<string, Profile>,
  periodLabel: string,
  filename: string = 'relatorio-vendas'
) => {
  const doc = new jsPDF('landscape');
  
  // Title
  doc.setFontSize(18);
  doc.text('Relatório de Vendas', 14, 20);
  
  // Period info
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Período: ${periodLabel}`, 14, 28);
  doc.text(`Gerado em: ${formatDate(new Date().toISOString())}`, 14, 34);
  
  // Summary
  const totalVendas = sales.length;
  const valorTotal = sales.reduce((acc, s) => acc + Number(s.valor_mensal), 0);
  const aprovadas = sales.filter(s => s.status === 'VENDA_AUDITADA' || s.status === 'INSTALACAO_MARCADA' || s.status === 'INSTALADA').length;
  
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.text(`Total de Vendas: ${totalVendas}`, 14, 42);
  doc.text(`Valor Total Mensal: ${formatCurrency(valorTotal)}`, 80, 42);
  doc.text(`Aprovadas: ${aprovadas}`, 180, 42);
  
  // Table
  const tableData = sales.map((sale) => [
    formatDate(sale.created_at),
    sale.cnpj_cliente,
    (sale.nome_fantasia || sale.razao_social).substring(0, 25),
    sale.produtos?.substring(0, 20) || '-',
    formatCurrency(Number(sale.valor_mensal)),
    SALE_STATUS_LABELS[sale.status],
    sale.seller_id && sellers[sale.seller_id] 
      ? sellers[sale.seller_id].nome.split(' ')[0] 
      : '-',
  ]);

  autoTable(doc, {
    startY: 48,
    head: [['Data', 'CNPJ', 'Cliente', 'Produtos', 'Valor', 'Status', 'Vendedor']],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [139, 92, 246] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 35 },
      2: { cellWidth: 50 },
      3: { cellWidth: 45 },
      4: { cellWidth: 30 },
      5: { cellWidth: 25 },
      6: { cellWidth: 30 },
    },
  });
  
  doc.save(`${filename}.pdf`);
};

export type PeriodFilter = '7d' | '30d' | '90d' | '365d' | 'all';

export const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 3 meses' },
  { value: '365d', label: 'Último ano' },
  { value: 'all', label: 'Todo período' },
];

export const filterByPeriod = <T extends { created_at: string }>(
  items: T[],
  period: PeriodFilter
): T[] => {
  if (period === 'all') return items;
  
  const days = parseInt(period);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return items.filter(item => new Date(item.created_at) >= cutoffDate);
};

export const getPeriodLabel = (period: PeriodFilter): string => {
  const option = PERIOD_OPTIONS.find(o => o.value === period);
  return option?.label || 'Todo período';
};