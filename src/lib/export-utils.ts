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

const formatDateTime = (date: string) => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

// Feedback export types
export interface ExportFeedback {
  id: string;
  title: string;
  message: string;
  created_by_name: string;
  seller_name?: string;
  created_at: string;
  read_at: string | null;
}

export const exportFeedbacksToExcel = (
  feedbacks: ExportFeedback[],
  filename: string = 'relatorio-feedbacks'
) => {
  const data = feedbacks.map((feedback) => ({
    'Data': formatDateTime(feedback.created_at),
    'Título': feedback.title,
    'Mensagem': feedback.message,
    'Enviado por': feedback.created_by_name,
    'Vendedor': feedback.seller_name || '-',
    'Status': feedback.read_at ? 'Lido' : 'Não lido',
    'Lido em': feedback.read_at ? formatDateTime(feedback.read_at) : '-',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 18 }, // Data
    { wch: 30 }, // Título
    { wch: 60 }, // Mensagem
    { wch: 25 }, // Enviado por
    { wch: 25 }, // Vendedor
    { wch: 12 }, // Status
    { wch: 18 }, // Lido em
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Feedbacks');
  
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportFeedbacksToPDF = (
  feedbacks: ExportFeedback[],
  filterDescription: string,
  filename: string = 'relatorio-feedbacks'
) => {
  const doc = new jsPDF('landscape');
  
  // Title
  doc.setFontSize(18);
  doc.text('Relatório de Feedbacks', 14, 20);
  
  // Filter info
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Filtros: ${filterDescription}`, 14, 28);
  doc.text(`Gerado em: ${formatDateTime(new Date().toISOString())}`, 14, 34);
  
  // Summary
  const totalFeedbacks = feedbacks.length;
  const lidos = feedbacks.filter(f => f.read_at).length;
  const naoLidos = feedbacks.filter(f => !f.read_at).length;
  
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.text(`Total de Feedbacks: ${totalFeedbacks}`, 14, 42);
  doc.text(`Lidos: ${lidos}`, 80, 42);
  doc.text(`Não lidos: ${naoLidos}`, 130, 42);
  
  // Table
  const tableData = feedbacks.map((feedback) => [
    formatDateTime(feedback.created_at),
    feedback.title.substring(0, 30),
    feedback.message.substring(0, 50) + (feedback.message.length > 50 ? '...' : ''),
    feedback.created_by_name,
    feedback.seller_name || '-',
    feedback.read_at ? 'Lido' : 'Não lido',
  ]);

  autoTable(doc, {
    startY: 48,
    head: [['Data', 'Título', 'Mensagem', 'Enviado por', 'Vendedor', 'Status']],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [139, 92, 246] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 45 },
      2: { cellWidth: 80 },
      3: { cellWidth: 35 },
      4: { cellWidth: 35 },
      5: { cellWidth: 25 },
    },
  });
  
  doc.save(`${filename}.pdf`);
};

// Export single sale details to PDF
export const exportSaleDetailsToPDF = (
  sale: Sale,
  sellerName?: string,
  filename: string = 'detalhes-venda'
) => {
  const doc = new jsPDF('portrait');
  
  const NEGOTIATION_TYPE_LABELS: Record<string, string> = {
    novo: 'Novo Cliente',
    portabilidade: 'Portabilidade',
    upgrade: 'Upgrade',
    migracao: 'Migração',
    bl_solo: 'BL Solo',
    vivo_total: 'VIVO TOTAL',
    banda_larga: 'Banda Larga',
  };

  let yPos = 20;
  const leftMargin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalhes da Venda', leftMargin, yPos);
  yPos += 10;
  
  // Date info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Gerado em: ${formatDateTime(new Date().toISOString())}`, leftMargin, yPos);
  yPos += 8;
  
  // Status badge
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`Status: ${SALE_STATUS_LABELS[sale.status]}`, leftMargin, yPos);
  doc.text(`Valor Mensal: ${formatCurrency(Number(sale.valor_mensal))}`, pageWidth / 2, yPos);
  yPos += 12;
  
  // Helper function to add section
  const addSection = (title: string, fields: [string, string | null | undefined][]) => {
    // Check if we need a new page
    if (yPos > 260) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(139, 92, 246);
    doc.text(title, leftMargin, yPos);
    yPos += 2;
    
    // Underline
    doc.setDrawColor(139, 92, 246);
    doc.setLineWidth(0.5);
    doc.line(leftMargin, yPos, pageWidth - leftMargin, yPos);
    yPos += 6;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    
    fields.forEach(([label, value]) => {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, leftMargin, yPos);
      doc.setFont('helvetica', 'normal');
      const displayValue = value || '-';
      // Handle long text
      const maxWidth = pageWidth - leftMargin - 60;
      const splitText = doc.splitTextToSize(displayValue, maxWidth);
      doc.text(splitText, 60, yPos);
      yPos += splitText.length > 1 ? splitText.length * 4 + 4 : 5;
    });
    
    yPos += 4;
  };
  
  // Main info section
  addSection('Informações da Venda', [
    ['Cliente', sale.nome_fantasia || sale.razao_social],
    ['CNPJ', sale.cnpj_cliente],
    ['Data da Venda', sale.data_venda ? formatDate(sale.data_venda) : '-'],
    ['Vendedor', sellerName || '-'],
    ['Equipe', sale.equipe],
    ['Tipo Negociação', NEGOTIATION_TYPE_LABELS[sale.tipo_negociacao || ''] || sale.tipo_negociacao],
  ]);
  
  // Company data
  addSection('Dados da Empresa', [
    ['Razão Social', sale.razao_social],
    ['Nome Fantasia', sale.nome_fantasia],
    ['E-mail', sale.email],
  ]);
  
  // Contacts
  addSection('Contatos', [
    ['Contato Responsável', sale.contato_responsavel],
    ['Telefone Responsável', sale.telefone_responsavel],
    ['Telefone 1', sale.telefone_1],
    ['Telefone 2', sale.telefone_2],
    ['Tel. Portabilidade', sale.telefone_portabilidade],
  ]);
  
  // Address
  const fullAddress = [
    sale.endereco_rua,
    sale.endereco_numero && `nº ${sale.endereco_numero}`,
    sale.endereco_bairro,
    sale.endereco_cidade,
  ].filter(Boolean).join(', ');
  
  addSection('Endereço de Instalação', [
    ['Endereço', fullAddress || '-'],
    ['CEP', sale.endereco_cep],
  ]);
  
  // Owner
  addSection('Dados do Proprietário', [
    ['Nome', sale.proprietario_nome],
    ['CPF', sale.proprietario_cpf],
    ['RG', sale.proprietario_rg],
    ['Nome da Mãe', sale.proprietario_mae],
    ['Data Nascimento', sale.proprietario_nascimento ? formatDate(sale.proprietario_nascimento) : '-'],
  ]);
  
  // Account manager
  addSection('Dados do Gestor de Conta', [
    ['Nome', sale.gestor_nome],
    ['CPF', sale.gestor_cpf],
    ['RG', sale.gestor_rg],
    ['Nome da Mãe', sale.gestor_mae],
    ['Data Nascimento', sale.gestor_nascimento ? formatDate(sale.gestor_nascimento) : '-'],
  ]);
  
  // Line assignor
  addSection('Dados do Cedente da Linha', [
    ['Nome', sale.cedente_nome],
    ['CPF', sale.cedente_cpf],
    ['RG', sale.cedente_rg],
    ['Nome da Mãe', sale.cedente_mae],
    ['Data Nascimento', sale.cedente_nascimento ? formatDate(sale.cedente_nascimento) : '-'],
  ]);
  
  // Plan
  addSection('Plano Contratado', [
    ['Produtos/Serviços', sale.produtos],
    ['Plano Contratado', sale.plano_contratado],
    ['Valor Mensal Total', formatCurrency(Number(sale.valor_mensal))],
    ['Valor BL', formatCurrency(Number(sale.bl_valor || 0))],
    ['Valor VIVO Total', formatCurrency(Number(sale.vivo_total_valor || 0))],
    ['Valor Móvel', formatCurrency(Number(sale.movel_valor || 0))],
  ]);
  
  // Additional info
  addSection('Informações Adicionais', [
    ['Observações', sale.observacoes_vendedor],
    ['Motivo Pendência', sale.motivo_pendencia],
    ['Criado em', formatDateTime(sale.created_at)],
    ['Atualizado em', formatDateTime(sale.updated_at)],
  ]);
  
  doc.save(`${filename}.pdf`);
};