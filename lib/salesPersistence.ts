// Sistema de persistencia local para ventas en proceso
// Evita pérdida de datos si se cierra la página

interface SaleItemDraft {
  productId: number;
  productName: string;
  quantity: number;
  paymentMethod: 'cash' | 'card' | 'qr' | 'transfer';
  unitPrice: number;
  timestamp: number;
}

interface VendorSalesDraft {
  vendorId: number;
  cashSessionId: number;
  salesItems: SaleItemDraft[];
  lastUpdated: number;
}

const STORAGE_KEY = 'megastock_sales_draft';
const AUTO_SAVE_INTERVAL = 2000; // Auto-guardar cada 2 segundos
const DRAFT_EXPIRY_HOURS = 24; // Los drafts expiran en 24 horas

export class SalesPersistence {
  private static instance: SalesPersistence;
  private autoSaveTimer: NodeJS.Timeout | null = null;

  static getInstance(): SalesPersistence {
    if (!SalesPersistence.instance) {
      SalesPersistence.instance = new SalesPersistence();
    }
    return SalesPersistence.instance;
  }

  // Guardar draft de ventas en localStorage
  saveDraft(vendorId: number, cashSessionId: number, salesItems: any[]): void {
    try {
      const draft: VendorSalesDraft = {
        vendorId,
        cashSessionId,
        salesItems: salesItems.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          paymentMethod: item.paymentMethod,
          unitPrice: item.product.price,
          timestamp: Date.now()
        })),
        lastUpdated: Date.now()
      };

      const existingDrafts = this.getAllDrafts();
      const draftKey = `${vendorId}_${cashSessionId}`;
      existingDrafts[draftKey] = draft;

      localStorage.setItem(STORAGE_KEY, JSON.stringify(existingDrafts));
      console.log('💾 Draft guardado automáticamente:', draft.salesItems.length, 'items');
    } catch (error) {
      console.error('Error guardando draft:', error);
    }
  }

  // Recuperar draft de ventas
  loadDraft(vendorId: number, cashSessionId: number): SaleItemDraft[] {
    try {
      const drafts = this.getAllDrafts();
      const draftKey = `${vendorId}_${cashSessionId}`;
      const draft = drafts[draftKey];

      if (!draft) return [];

      // Verificar si el draft no ha expirado
      const hoursAgo = (Date.now() - draft.lastUpdated) / (1000 * 60 * 60);
      if (hoursAgo > DRAFT_EXPIRY_HOURS) {
        this.clearDraft(vendorId, cashSessionId);
        return [];
      }

      console.log('🔄 Draft recuperado:', draft.salesItems.length, 'items');
      return draft.salesItems;
    } catch (error) {
      console.error('Error cargando draft:', error);
      return [];
    }
  }

  // Limpiar draft después de guardar exitosamente
  clearDraft(vendorId: number, cashSessionId: number): void {
    try {
      const drafts = this.getAllDrafts();
      const draftKey = `${vendorId}_${cashSessionId}`;
      delete drafts[draftKey];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
      console.log('🗑️ Draft eliminado después de guardar');
    } catch (error) {
      console.error('Error limpiando draft:', error);
    }
  }

  // Obtener todos los drafts
  private getAllDrafts(): { [key: string]: VendorSalesDraft } {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error leyendo drafts:', error);
      return {};
    }
  }

  // Iniciar auto-guardado automático
  startAutoSave(vendorId: number, cashSessionId: number, getSalesItems: () => any[]): void {
    this.stopAutoSave(); // Limpiar timer anterior

    this.autoSaveTimer = setInterval(() => {
      const items = getSalesItems();
      if (items.length > 0) {
        this.saveDraft(vendorId, cashSessionId, items);
      }
    }, AUTO_SAVE_INTERVAL);

    console.log('🔄 Auto-guardado iniciado cada', AUTO_SAVE_INTERVAL / 1000, 'segundos');
  }

  // Detener auto-guardado
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
      console.log('⏹️ Auto-guardado detenido');
    }
  }

  // Limpiar drafts expirados
  cleanExpiredDrafts(): void {
    try {
      const drafts = this.getAllDrafts();
      const now = Date.now();
      let cleaned = 0;

      Object.keys(drafts).forEach(key => {
        const draft = drafts[key];
        const hoursAgo = (now - draft.lastUpdated) / (1000 * 60 * 60);
        
        if (hoursAgo > DRAFT_EXPIRY_HOURS) {
          delete drafts[key];
          cleaned++;
        }
      });

      if (cleaned > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
        console.log('🧹 Limpiados', cleaned, 'drafts expirados');
      }
    } catch (error) {
      console.error('Error limpiando drafts expirados:', error);
    }
  }

  // Verificar si hay drafts pendientes para mostrar notificación
  hasPendingDrafts(vendorId: number, cashSessionId: number): boolean {
    const draft = this.loadDraft(vendorId, cashSessionId);
    return draft.length > 0;
  }

  // Obtener resumen de drafts pendientes
  getDraftSummary(vendorId: number, cashSessionId: number): string {
    const draft = this.loadDraft(vendorId, cashSessionId);
    if (draft.length === 0) return '';

    const totalItems = draft.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = draft.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    return `${draft.length} productos (${totalItems} unidades) por $${totalValue.toLocaleString('es-CL')}`;
  }

  // Recuperar draft y convertir a SaleItems
  async recoverDraft(vendorId: number, cashSessionId: number, products: any[]): Promise<any[]> {
    const draft = this.loadDraft(vendorId, cashSessionId);
    if (draft.length === 0) return [];

    const recoveredItems = [];
    
    for (const draftItem of draft) {
      const product = products.find(p => p.id === draftItem.productId);
      if (product && product.stock >= draftItem.quantity) {
        recoveredItems.push({
          product,
          quantity: draftItem.quantity,
          unitPrice: draftItem.unitPrice,
          paymentMethod: draftItem.paymentMethod,
          applyPromotion: false
        });
      }
    }

    return recoveredItems;
  }
}

// Instancia singleton
export const salesPersistence = SalesPersistence.getInstance();
