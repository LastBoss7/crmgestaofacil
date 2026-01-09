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

// Banda Larga Report export types
export interface BandaLargaStats {
  tipo: string;
  count: number;
  value: number;
  percentage: number;
}

export const exportBandaLargaToExcel = (
  stats: BandaLargaStats[],
  total: number,
  totalValue: number,
  periodLabel: string,
  sellerName?: string,
  filename: string = 'relatorio-banda-larga'
) => {
  // Summary sheet data
  const summaryData = [
    { 'Métrica': 'Total de Vendas', 'Valor': total },
    { 'Métrica': 'Valor Total', 'Valor': formatCurrency(totalValue) },
    { 'Métrica': 'Ticket Médio', 'Valor': formatCurrency(total > 0 ? totalValue / total : 0) },
    { 'Métrica': 'Período', 'Valor': periodLabel },
    { 'Métrica': 'Vendedor', 'Valor': sellerName || 'Todos os vendedores' },
  ];

  // Detail sheet data
  const detailData = stats.map((stat) => ({
    'Tipo de Negociação': stat.tipo,
    'Quantidade': stat.count,
    'Valor Total': Number(stat.value),
    '% do Total': `${stat.percentage.toFixed(1)}%`,
    'Ticket Médio': Number(stat.count > 0 ? stat.value / stat.count : 0),
  }));

  const wb = XLSX.utils.book_new();
  
  // Summary sheet
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');
  
  // Detail sheet
  const wsDetail = XLSX.utils.json_to_sheet(detailData);
  wsDetail['!cols'] = [
    { wch: 25 }, // Tipo
    { wch: 12 }, // Quantidade
    { wch: 18 }, // Valor Total
    { wch: 12 }, // % do Total
    { wch: 18 }, // Ticket Médio
  ];
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalhamento');
  
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportBandaLargaToPDF = (
  stats: BandaLargaStats[],
  total: number,
  totalValue: number,
  periodLabel: string,
  sellerName?: string,
  filename: string = 'relatorio-banda-larga'
) => {
  const doc = new jsPDF('portrait');
  
  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Banda Larga', 14, 20);
  
  // Period info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Período: ${periodLabel}`, 14, 28);
  doc.text(`Vendedor: ${sellerName || 'Todos os vendedores'}`, 14, 34);
  doc.text(`Gerado em: ${formatDate(new Date().toISOString())}`, 14, 40);
  
  // Summary box
  doc.setTextColor(0);
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(14, 46, 180, 30, 3, 3, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Total de Vendas:', 20, 56);
  doc.text('Valor Total:', 80, 56);
  doc.text('Ticket Médio:', 140, 56);
  
  doc.setFont('helvetica', 'normal');
  doc.text(String(total), 20, 66);
  doc.text(formatCurrency(totalValue), 80, 66);
  doc.text(formatCurrency(total > 0 ? totalValue / total : 0), 140, 66);
  
  // Table
  const tableData = stats.map((stat) => [
    stat.tipo,
    String(stat.count),
    formatCurrency(stat.value),
    `${stat.percentage.toFixed(1)}%`,
    formatCurrency(stat.count > 0 ? stat.value / stat.count : 0),
  ]);

  autoTable(doc, {
    startY: 84,
    head: [['Tipo', 'Qtd', 'Valor Total', '% do Total', 'Ticket Médio']],
    body: tableData,
    foot: [[
      'TOTAL',
      String(total),
      formatCurrency(totalValue),
      '100%',
      formatCurrency(total > 0 ? totalValue / total : 0),
    ]],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [59, 130, 246] },
    footStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 30, halign: 'center' },
      4: { cellWidth: 40, halign: 'right' },
    },
  });
  
  doc.save(`${filename}.pdf`);
};

// Campaign Rankings export types
export interface CampaignRankingExportData {
  sellerId: string;
  nome: string;
  salesCount: number;
  totalValue: number;
  campaigns: number;
}

export interface CampaignExportData {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  target_value: number;
  target_sales: number;
  salesCount: number;
  totalValue: number;
  uniqueSellers: number;
}

export const exportCampaignRankingToExcel = (
  ranking: CampaignRankingExportData[],
  campaigns: CampaignExportData[],
  filterLabel: string,
  filename: string = 'ranking-campanhas'
) => {
  const wb = XLSX.utils.book_new();
  
  // Ranking sheet
  const rankingData = ranking.map((seller, index) => ({
    'Posição': index + 1,
    'Vendedor': seller.nome,
    'Vendas': seller.salesCount,
    'Valor Total': Number(seller.totalValue),
    'Campanhas Participadas': seller.campaigns,
    'Ticket Médio': Number(seller.salesCount > 0 ? seller.totalValue / seller.salesCount : 0),
  }));

  const wsRanking = XLSX.utils.json_to_sheet(rankingData);
  wsRanking['!cols'] = [
    { wch: 10 }, // Posição
    { wch: 30 }, // Vendedor
    { wch: 10 }, // Vendas
    { wch: 18 }, // Valor Total
    { wch: 22 }, // Campanhas
    { wch: 18 }, // Ticket Médio
  ];
  XLSX.utils.book_append_sheet(wb, wsRanking, 'Ranking Geral');

  // Campaigns sheet
  const campaignsData = campaigns.map((campaign) => ({
    'Campanha': campaign.name,
    'Início': formatDate(campaign.start_date),
    'Fim': formatDate(campaign.end_date),
    'Meta Vendas': campaign.target_sales,
    'Vendas Realizadas': campaign.salesCount,
    '% Meta Vendas': `${Math.min((campaign.salesCount / campaign.target_sales) * 100, 100).toFixed(1)}%`,
    'Meta Valor': Number(campaign.target_value),
    'Valor Realizado': Number(campaign.totalValue),
    '% Meta Valor': `${Math.min((campaign.totalValue / campaign.target_value) * 100, 100).toFixed(1)}%`,
    'Vendedores': campaign.uniqueSellers,
  }));

  const wsCampaigns = XLSX.utils.json_to_sheet(campaignsData);
  wsCampaigns['!cols'] = [
    { wch: 25 }, // Campanha
    { wch: 12 }, // Início
    { wch: 12 }, // Fim
    { wch: 12 }, // Meta Vendas
    { wch: 18 }, // Vendas Realizadas
    { wch: 15 }, // % Meta Vendas
    { wch: 15 }, // Meta Valor
    { wch: 18 }, // Valor Realizado
    { wch: 15 }, // % Meta Valor
    { wch: 12 }, // Vendedores
  ];
  XLSX.utils.book_append_sheet(wb, wsCampaigns, 'Campanhas');

  // Summary sheet
  const totalSales = ranking.reduce((acc, r) => acc + r.salesCount, 0);
  const totalValue = ranking.reduce((acc, r) => acc + r.totalValue, 0);
  const summaryData = [
    { 'Métrica': 'Total de Vendedores', 'Valor': ranking.length },
    { 'Métrica': 'Total de Campanhas', 'Valor': campaigns.length },
    { 'Métrica': 'Total de Vendas', 'Valor': totalSales },
    { 'Métrica': 'Valor Total Faturado', 'Valor': formatCurrency(totalValue) },
    { 'Métrica': 'Ticket Médio', 'Valor': formatCurrency(totalSales > 0 ? totalValue / totalSales : 0) },
    { 'Métrica': 'Filtro Aplicado', 'Valor': filterLabel },
    { 'Métrica': 'Gerado em', 'Valor': formatDateTime(new Date().toISOString()) },
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportCampaignRankingToPDF = (
  ranking: CampaignRankingExportData[],
  campaigns: CampaignExportData[],
  filterLabel: string,
  filename: string = 'ranking-campanhas'
) => {
  const doc = new jsPDF('portrait');
  
  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Ranking de Campanhas', 14, 20);
  
  // Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Filtro: ${filterLabel}`, 14, 28);
  doc.text(`Gerado em: ${formatDateTime(new Date().toISOString())}`, 14, 34);
  
  // Summary box
  const totalSales = ranking.reduce((acc, r) => acc + r.salesCount, 0);
  const totalValue = ranking.reduce((acc, r) => acc + r.totalValue, 0);
  
  doc.setTextColor(0);
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(14, 40, 180, 24, 3, 3, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Campanhas:', 20, 48);
  doc.text('Vendedores:', 60, 48);
  doc.text('Total Vendas:', 100, 48);
  doc.text('Valor Total:', 145, 48);
  
  doc.setFont('helvetica', 'normal');
  doc.text(String(campaigns.length), 20, 56);
  doc.text(String(ranking.length), 60, 56);
  doc.text(String(totalSales), 100, 56);
  doc.text(formatCurrency(totalValue), 145, 56);
  
  // Ranking table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 92, 246);
  doc.text('Ranking de Vendedores', 14, 74);
  
  const rankingTableData = ranking.slice(0, 15).map((seller, index) => [
    String(index + 1),
    index === 0 ? '🥇 ' + seller.nome : index === 1 ? '🥈 ' + seller.nome : index === 2 ? '🥉 ' + seller.nome : seller.nome,
    String(seller.salesCount),
    formatCurrency(seller.totalValue),
    String(seller.campaigns),
  ]);

  autoTable(doc, {
    startY: 78,
    head: [['#', 'Vendedor', 'Vendas', 'Valor Total', 'Campanhas']],
    body: rankingTableData,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [139, 92, 246] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 60 },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 40, halign: 'right' },
      4: { cellWidth: 25, halign: 'center' },
    },
  });

  // Campaigns table on new page
  doc.addPage();
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 92, 246);
  doc.text('Performance das Campanhas', 14, 20);
  
  const campaignsTableData = campaigns.map((campaign) => [
    campaign.name.substring(0, 20),
    `${formatDate(campaign.start_date)} - ${formatDate(campaign.end_date)}`,
    `${campaign.salesCount}/${campaign.target_sales}`,
    formatCurrency(campaign.totalValue),
    String(campaign.uniqueSellers),
  ]);

  autoTable(doc, {
    startY: 26,
    head: [['Campanha', 'Período', 'Vendas', 'Faturamento', 'Vendedores']],
    body: campaignsTableData,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 50 },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 25, halign: 'center' },
    },
  });
  
  doc.save(`${filename}.pdf`);
};