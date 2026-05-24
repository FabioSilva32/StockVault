import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Language = 'en' | 'pt' | 'es';

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    // Navbar
    'nav.wallet': 'My Wallet',
    'nav.market': 'Market',
    'nav.compare': 'Compare',
    'nav.watchlist': 'Watchlist',
    'nav.history': 'History',
    'nav.journal': 'Journal',
    'nav.market_open': 'Market Open',
    'nav.market_closed': 'Closed',

    // Portfolio
    'portfolio.title': 'My Portfolio',
    'portfolio.net_assets': 'Net Assets',
    'portfolio.total_pl': 'Total P&L',
    'portfolio.day_pl': "Today's P&L",
    'portfolio.buying_power': 'Buying Power',
    'portfolio.positions': 'Positions',
    'portfolio.leaderboard': '🏆 Performance Leaderboard',
    'portfolio.leaderboard_subtitle': 'Holdings ranked by return %',
    'portfolio.holdings': 'Holdings',
    'portfolio.deposit': 'Deposit',
    'portfolio.withdraw': 'Withdraw',
    'portfolio.empty_title': 'Your portfolio is empty',
    'portfolio.empty_desc': 'Start investing by buying stocks from the Market',
    'portfolio.explore': 'Explore Market',
    'portfolio.diversity': 'Portfolio Diversity',

    // New Portfolio Keys
    'portfolio.dividend_tracker': 'Dividend Tracker',
    'portfolio.best_position': 'Best Position',
    'portfolio.diversity_sub': 'Portfolio diversification by sector',
    'portfolio.dividend_sub': 'Projected cash flows from holdings',
    'portfolio.risk_sub': 'Concentration & volatility scoring',
    'portfolio.risk_audit': 'Portfolio Risk Audit',
    'portfolio.sector_concentration': 'Sector Concentration',
    'portfolio.weighted_volatility': 'Weighted Asset Volatility',
    'portfolio.est_annual_dividends': 'Est. Annual Dividends',
    'portfolio.avg_weighted_yield': 'Avg. Weighted Yield',
    'portfolio.asset': 'Asset',
    'portfolio.yield': 'Yield',
    'portfolio.annual_est': 'Annual Est.',
    'portfolio.holdings_sub': 'Real-time portfolio performance',
    'portfolio.share_portfolio': 'Share Portfolio',
    'portfolio.total': 'Portfolio Total',
    'portfolio.qty': 'Qty',
    'portfolio.avg_price': 'Avg Price',
    'portfolio.total_cost': 'Total Cost',
    'portfolio.current_price': 'Current Price',
    'portfolio.current_value': 'Current Value',
    'portfolio.gain_loss': 'Gain / Loss',
    'portfolio.var_pct': 'Var %',
    'portfolio.actions': 'Actions',

    // Market
    'market.title': 'Market',
    'market.explorer': 'Explorer',
    'market.heatmap': 'Heatmap',
    'market.calendar': 'Calendar',
    'market.search': 'Search ticker or company name...',
    'market.trending': '🔥 Trending',
    'market.watchlist_add': 'Add to Watchlist',
    'market.watchlist_remove': 'Remove from Watchlist',

    // New Market Keys
    'market.explorer_sub': 'Search any stock — click to view details or buy directly',
    'market.search_results': 'Search Results',
    'market.popular_stocks': 'Popular Stocks',
    'market.popular_sub': 'Top market picks — live prices',
    'market.top_gainers': 'Top Gainers',
    'market.top_losers': 'Top Losers',
    'market.heatmap_title': 'Finviz-Style Sector Heatmap',
    'market.heatmap_sub': 'Glow intensity maps live percent fluctuations — click card to analyze',
    'market.calendar_title': 'Earnings & Corporate Events Schedule',
    'market.calendar_sub': 'Forecasted financial filings, EPS estimates, and consensus ratings',
    'market.reporting_date': 'Reporting Date',
    'market.consensus_eps': 'Consensus EPS',
    'market.est_revenue': 'Estimated Revenue',
    'market.prev_eps': 'Previous EPS',
    'market.schedule': 'Schedule:',
    'market.clocks_title': 'World Trading Clocks',

    // Watchlist
    'watchlist.title': 'Live Alert Dashboard',
    'watchlist.subtitle_1': 'stock monitored in real-time',
    'watchlist.subtitle_many': 'stocks monitored in real-time',
    'watchlist.live': 'Live prices updating',
    'watchlist.no_alerts': 'No alerts',
    'watchlist.alert_btn': 'Alert',
    'watchlist.compare_btn': 'Compare',
    'watchlist.empty_title': 'Your watchlist is empty',
    'watchlist.empty_desc': 'Add stocks from the Market by clicking the ⭐ icon',
    'watchlist.set_alert': 'Set Price Alert',
    'watchlist.price_above': '▲ Price Above',
    'watchlist.price_below': '▼ Price Below',
    'watchlist.save_alert': 'Set Alert',

    // Journal
    'journal.title': '📔 Trading Journal',
    'journal.subtitle': 'Track your trades, add notes, and reflect on your investment decisions',
    'journal.total_trades': 'Total Trades',
    'journal.buys': 'Buys',
    'journal.sells': 'Sells',
    'journal.volume': 'Total Volume',
    'journal.most_traded': 'Most Traded',
    'journal.avg_size': 'Avg Trade Size',
    'journal.empty_title': 'No journal entries yet',
    'journal.empty_desc': 'Your journal automatically fills up as you make trades.',
    'journal.mood_q': 'How do you feel about this trade?',
    'journal.tags': 'Tags',
    'journal.note': '📝 Trade Note',
    'journal.note_placeholder': 'Click to add a note about this trade...',
    'journal.save_note': 'Save Note',
    'journal.edit': 'Edit',
    'journal.cancel': 'Cancel',

    // Compare
    'compare.title': 'Stock Comparison',
    'compare.add': 'Add ticker',
    'compare.compare': 'Compare',
    'compare.table_header': 'Multiples & Fundamentals Matrix',

    // Buttons
    'btn.buy': 'Buy',
    'btn.sell': 'Sell',
    'btn.refresh': 'Refresh',
    'btn.deposit': 'Deposit',
    'btn.withdraw': 'Withdraw',
    'btn.close': 'Cancel',
    'btn.confirm_buy': 'Confirm Buy',
    'btn.confirm_sell': 'Confirm Sell',
    'btn.explore': 'Explore Market',

    // Common
    'common.loading': 'Loading...',
    'common.today': 'Today',
    'common.week': '1W',
    'common.month': '1M',
    'common.year': '1Y',
    'common.all': 'All',
  },

  pt: {
    // Navbar
    'nav.wallet': 'Minha Carteira',
    'nav.market': 'Mercado',
    'nav.compare': 'Comparar',
    'nav.watchlist': 'Favoritos',
    'nav.history': 'Histórico',
    'nav.journal': 'Diário',
    'nav.market_open': 'Mercado Aberto',
    'nav.market_closed': 'Fechado',

    // Portfolio
    'portfolio.title': 'Meu Portfólio',
    'portfolio.net_assets': 'Ativos Líquidos',
    'portfolio.total_pl': 'P&L Total',
    'portfolio.day_pl': 'P&L de Hoje',
    'portfolio.buying_power': 'Poder de Compra',
    'portfolio.positions': 'Posições',
    'portfolio.leaderboard': '🏆 Classificação de Desempenho',
    'portfolio.leaderboard_subtitle': 'Holdings classificados por retorno %',
    'portfolio.holdings': 'Posições',
    'portfolio.deposit': 'Depositar',
    'portfolio.withdraw': 'Levantar',
    'portfolio.empty_title': 'Seu portfólio está vazio',
    'portfolio.empty_desc': 'Comece a investir comprando ações no Mercado',
    'portfolio.explore': 'Explorar Mercado',
    'portfolio.diversity': 'Diversidade do Portfólio',

    // New Portfolio Keys
    'portfolio.dividend_tracker': 'Rastreador de Dividendos',
    'portfolio.best_position': 'Melhor Posição',
    'portfolio.diversity_sub': 'Diversificação de portfólio por setor',
    'portfolio.dividend_sub': 'Fluxos de caixa projetados de posições',
    'portfolio.risk_sub': 'Pontuação de concentração e volatilidade',
    'portfolio.risk_audit': 'Auditoria de Risco da Carteira',
    'portfolio.sector_concentration': 'Concentração Setorial',
    'portfolio.weighted_volatility': 'Volatilidade Ponderada de Ativos',
    'portfolio.est_annual_dividends': 'Dividendos Anuais Est.',
    'portfolio.avg_weighted_yield': 'Rendimento Médio Ponderado',
    'portfolio.asset': 'Ativo',
    'portfolio.yield': 'Rendimento',
    'portfolio.annual_est': 'Est. Anual',
    'portfolio.holdings_sub': 'Desempenho da carteira em tempo real',
    'portfolio.share_portfolio': 'Partilhar Carteira',
    'portfolio.total': 'Total da Carteira',
    'portfolio.qty': 'Qtd',
    'portfolio.avg_price': 'Preço Médio',
    'portfolio.total_cost': 'Custo Total',
    'portfolio.current_price': 'Preço Atual',
    'portfolio.current_value': 'Valor Atual',
    'portfolio.gain_loss': 'Ganho / Perda',
    'portfolio.var_pct': 'Var %',
    'portfolio.actions': 'Ações',

    // Market
    'market.title': 'Mercado',
    'market.explorer': 'Explorador',
    'market.heatmap': 'Mapa de Calor',
    'market.calendar': 'Calendário',
    'market.search': 'Pesquisar ticker ou nome da empresa...',
    'market.trending': '🔥 Em Alta',
    'market.watchlist_add': 'Adicionar aos Favoritos',
    'market.watchlist_remove': 'Remover dos Favoritos',

    // New Market Keys
    'market.explorer_sub': 'Pesquisar qualquer ação — clique para ver detalhes ou comprar diretamente',
    'market.search_results': 'Resultados da Pesquisa',
    'market.popular_stocks': 'Ações Populares',
    'market.popular_sub': 'Principais escolhas do mercado — preços ao vivo',
    'market.top_gainers': 'Maiores Altas',
    'market.top_losers': 'Maiores Baixas',
    'market.heatmap_title': 'Mapa de Calor de Setores (Estilo Finviz)',
    'market.heatmap_sub': 'Intensidade do brilho mostra flutuações percentuais ao vivo',
    'market.calendar_title': 'Calendário Corporativo e de Resultados',
    'market.calendar_sub': 'Apresentações financeiras previstas, estimativas de EPS e classificações',
    'market.reporting_date': 'Data do Relatório',
    'market.consensus_eps': 'Consenso EPS',
    'market.est_revenue': 'Receita Estimada',
    'market.prev_eps': 'EPS Anterior',
    'market.schedule': 'Horário:',
    'market.clocks_title': 'Relógios de Negociação Mundiais',

    // Watchlist
    'watchlist.title': 'Painel de Alertas ao Vivo',
    'watchlist.subtitle_1': 'ação monitorada em tempo real',
    'watchlist.subtitle_many': 'ações monitoradas em tempo real',
    'watchlist.live': 'Preços ao vivo',
    'watchlist.no_alerts': 'Sem alertas',
    'watchlist.alert_btn': 'Alerta',
    'watchlist.compare_btn': 'Comparar',
    'watchlist.empty_title': 'Seus favoritos estão vazios',
    'watchlist.empty_desc': 'Adicione ações do Mercado clicando no ícone ⭐',
    'watchlist.set_alert': 'Definir Alerta de Preço',
    'watchlist.price_above': '▲ Preço Acima de',
    'watchlist.price_below': '▼ Preço Abaixo de',
    'watchlist.save_alert': 'Guardar Alerta',

    // Journal
    'journal.title': '📔 Diário de Negociação',
    'journal.subtitle': 'Registe os seus trades e reflita sobre as suas decisões de investimento',
    'journal.total_trades': 'Total de Trades',
    'journal.buys': 'Compras',
    'journal.sells': 'Vendas',
    'journal.volume': 'Volume Total',
    'journal.most_traded': 'Mais Negociado',
    'journal.avg_size': 'Tamanho Médio',
    'journal.empty_title': 'Nenhuma entrada no diário',
    'journal.empty_desc': 'O seu diário é preenchido automaticamente com cada trade.',
    'journal.mood_q': 'Como se sente sobre este trade?',
    'journal.tags': 'Etiquetas',
    'journal.note': '📝 Nota do Trade',
    'journal.note_placeholder': 'Clique para adicionar uma nota...',
    'journal.save_note': 'Guardar Nota',
    'journal.edit': 'Editar',
    'journal.cancel': 'Cancelar',

    // Compare
    'compare.title': 'Comparação de Ações',
    'compare.add': 'Adicionar ticker',
    'compare.compare': 'Comparar',
    'compare.table_header': 'Matriz de Múltiplos e Fundamentais',

    // Buttons
    'btn.buy': 'Comprar',
    'btn.sell': 'Vender',
    'btn.refresh': 'Atualizar',
    'btn.deposit': 'Depositar',
    'btn.withdraw': 'Levantar',
    'btn.close': 'Cancelar',
    'btn.confirm_buy': 'Confirmar Compra',
    'btn.confirm_sell': 'Confirmar Venda',
    'btn.explore': 'Explorar Mercado',

    // Common
    'common.loading': 'Carregando...',
    'common.today': 'Hoje',
    'common.week': '1S',
    'common.month': '1M',
    'common.year': '1A',
    'common.all': 'Todos',
  },

  es: {
    // Navbar
    'nav.wallet': 'Mi Cartera',
    'nav.market': 'Mercado',
    'nav.compare': 'Comparar',
    'nav.watchlist': 'Favoritos',
    'nav.history': 'Historial',
    'nav.journal': 'Diario',
    'nav.market_open': 'Mercado Abierto',
    'nav.market_closed': 'Cerrado',

    // Portfolio
    'portfolio.title': 'Mi Portafolio',
    'portfolio.net_assets': 'Activos Netos',
    'portfolio.total_pl': 'P&L Total',
    'portfolio.day_pl': 'P&L de Hoy',
    'portfolio.buying_power': 'Poder de Compra',
    'portfolio.positions': 'Posiciones',
    'portfolio.leaderboard': '🏆 Clasificación de Rendimiento',
    'portfolio.leaderboard_subtitle': 'Holdings clasificados por retorno %',
    'portfolio.holdings': 'Posiciones',
    'portfolio.deposit': 'Depositar',
    'portfolio.withdraw': 'Retirar',
    'portfolio.empty_title': 'Tu portafolio está vacío',
    'portfolio.empty_desc': 'Comienza a invertir comprando acciones en el Mercado',
    'portfolio.explore': 'Explorar Mercado',
    'portfolio.diversity': 'Diversidad del Portafolio',

    // New Portfolio Keys
    'portfolio.dividend_tracker': 'Rastreador de Dividendos',
    'portfolio.best_position': 'Mejor Posición',
    'portfolio.diversity_sub': 'Diversificación de cartera por sector',
    'portfolio.dividend_sub': 'Flujos de caja proyectados de posiciones',
    'portfolio.risk_sub': 'Puntuación de concentración y volatilidad',
    'portfolio.risk_audit': 'Auditoría de Riesgo del Portafolio',
    'portfolio.sector_concentration': 'Concentración Sectorial',
    'portfolio.weighted_volatility': 'Volatilidad Ponderada de Activos',
    'portfolio.est_annual_dividends': 'Dividendos Anuales Est.',
    'portfolio.avg_weighted_yield': 'Rendimiento Medio Ponderado',
    'portfolio.asset': 'Activo',
    'portfolio.yield': 'Rendimiento',
    'portfolio.annual_est': 'Est. Anual',
    'portfolio.holdings_sub': 'Rendimiento de cartera en tiempo real',
    'portfolio.share_portfolio': 'Compartir Cartera',
    'portfolio.total': 'Total del Portafolio',
    'portfolio.qty': 'Cant',
    'portfolio.avg_price': 'Precio Medio',
    'portfolio.total_cost': 'Costo Total',
    'portfolio.current_price': 'Precio Actual',
    'portfolio.current_value': 'Valor Actual',
    'portfolio.gain_loss': 'Ganancia / Pérdida',
    'portfolio.var_pct': 'Var %',
    'portfolio.actions': 'Acciones',

    // Market
    'market.title': 'Mercado',
    'market.explorer': 'Explorador',
    'market.heatmap': 'Mapa de Calor',
    'market.calendar': 'Calendario',
    'market.search': 'Buscar ticker o nombre de empresa...',
    'market.trending': '🔥 Tendencias',
    'market.watchlist_add': 'Añadir a Favoritos',
    'market.watchlist_remove': 'Eliminar de Favoritos',

    // New Market Keys
    'market.explorer_sub': 'Buscar cualquier acción — haga clic para ver detalles o comprar directamente',
    'market.search_results': 'Resultados de Búsqueda',
    'market.popular_stocks': 'Acciones Populares',
    'market.popular_sub': 'Principales selecciones del mercado — precios en vivo',
    'market.top_gainers': 'Mayores Alzas',
    'market.top_losers': 'Mayores Bajas',
    'market.heatmap_title': 'Mapa de Calor de Sectores (Estilo Finviz)',
    'market.heatmap_sub': 'Intensidad de brillo muestra fluctuaciones porcentuales en vivo',
    'market.calendar_title': 'Calendario Corporativo y de Resultados',
    'market.calendar_sub': 'Presentaciones financieras previstas, estimaciones de EPS y calificaciones',
    'market.reporting_date': 'Fecha del Informe',
    'market.consensus_eps': 'Consenso EPS',
    'market.est_revenue': 'Ingresos Estimados',
    'market.prev_eps': 'EPS Anterior',
    'market.schedule': 'Horario:',
    'market.clocks_title': 'Relojes de Negociación Mundiales',

    // Watchlist
    'watchlist.title': 'Panel de Alertas en Vivo',
    'watchlist.subtitle_1': 'acción monitoreada en tiempo real',
    'watchlist.subtitle_many': 'acciones monitoreadas en tiempo real',
    'watchlist.live': 'Precios en vivo',
    'watchlist.no_alerts': 'Sin alertas',
    'watchlist.alert_btn': 'Alerta',
    'watchlist.compare_btn': 'Comparar',
    'watchlist.empty_title': 'Tu lista de favoritos está vacía',
    'watchlist.empty_desc': 'Añade acciones desde el Mercado haciendo clic en el icono ⭐',
    'watchlist.set_alert': 'Definir Alerta de Precio',
    'watchlist.price_above': '▲ Precio Sobre',
    'watchlist.price_below': '▼ Precio Bajo',
    'watchlist.save_alert': 'Guardar Alerta',

    // Journal
    'journal.title': '📔 Diario de Trading',
    'journal.subtitle': 'Registra tus operaciones y reflexiona sobre tus decisiones de inversión',
    'journal.total_trades': 'Total Operaciones',
    'journal.buys': 'Compras',
    'journal.sells': 'Ventas',
    'journal.volume': 'Volumen Total',
    'journal.most_traded': 'Más Negociado',
    'journal.avg_size': 'Tamaño Promedio',
    'journal.empty_title': 'No hay entradas en el diario',
    'journal.empty_desc': 'Tu diario se llena automáticamente con cada operación.',
    'journal.mood_q': '¿Cómo te sientes sobre esta operación?',
    'journal.tags': 'Etiquetas',
    'journal.note': '📝 Nota de Operación',
    'journal.note_placeholder': 'Haz clic para añadir una nota...',
    'journal.save_note': 'Guardar Nota',
    'journal.edit': 'Editar',
    'journal.cancel': 'Cancelar',

    // Compare
    'compare.title': 'Comparación de Acciones',
    'compare.add': 'Añadir ticker',
    'compare.compare': 'Comparar',
    'compare.table_header': 'Matriz de Múltiplos y Fundamentales',

    // Buttons
    'btn.buy': 'Comprar',
    'btn.sell': 'Vender',
    'btn.refresh': 'Actualizar',
    'btn.deposit': 'Depositar',
    'btn.withdraw': 'Retirar',
    'btn.close': 'Cancelar',
    'btn.confirm_buy': 'Confirmar Compra',
    'btn.confirm_sell': 'Confirmar Venta',
    'btn.explore': 'Explorar Mercado',

    // Common
    'common.loading': 'Cargando...',
    'common.today': 'Hoy',
    'common.week': '1S',
    'common.month': '1M',
    'common.year': '1A',
    'common.all': 'Todos',
  }
};

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private langSubject = new BehaviorSubject<Language>(this.loadSaved());
  public lang$ = this.langSubject.asObservable();

  get current(): Language {
    return this.langSubject.value;
  }

  setLanguage(lang: Language): void {
    this.langSubject.next(lang);
    localStorage.setItem('sv-lang', lang);
    document.documentElement.lang = lang;
  }

  translate(key: string): string {
    return TRANSLATIONS[this.current][key] || TRANSLATIONS['en'][key] || key;
  }

  private loadSaved(): Language {
    const saved = localStorage.getItem('sv-lang') as Language;
    return saved && ['en', 'pt', 'es'].includes(saved) ? saved : 'en';
  }
}
