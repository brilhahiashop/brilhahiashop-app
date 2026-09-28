import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://lnezqvonjcvhgaogndqh.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_bm64tpscRoPyieo2qQqpCQ_BNSX-TcC';
export const ADMIN_EMAIL = 'brilhahiashop+admin@gmail.com';
export const SHIPPING_FLAT = 5;
export const DEFAULT_CARRIER = 'InPost';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

export const MENU = [
  ['dashboard','⌂','Dashboard'],
  ['produtos','◇','Produtos'],
  ['stock','▦','Stock / Variantes'],
  ['vendas','€','Vendas / Encomendas'],
  ['reservas','◷','Reservas / Diretos'],
  ['clientes','♙','Clientes'],
  ['compras','↓','Compras / Entradas'],
  ['fornecedores','◈','Fornecedores'],
  ['reposicao','↥','Reposição'],
  ['inventario','✓','Inventário físico'],
  ['devolucoes','↩','Devoluções'],
  ['envios','➜','Envios'],
  ['despesas','−','Despesas'],
  ['estatisticas','▥','Estatísticas'],
  ['historico','↺','Histórico'],
  ['definicoes','⚙','Definições'],
];

export const CHANNELS = ['direto','facebook','instagram','tiktok','whatsapp','presencial','outro'];
export const PAYMENTS = ['MB Way','Dinheiro','Transferência','PayPal','Outro'];
export const ORDER_STATUS = [
  ['new','Nova'],['awaiting_payment','A aguardar pagamento'],['paid','Paga'],['preparing','A preparar'],
  ['ready','Pronta'],['shipped','Enviada'],['delivered','Entregue'],['cancelled','Cancelada'],['returned','Devolvida']
];

export const money = v => `${Number(v || 0).toFixed(2).replace('.', ',')} €`;
export const available = v => Number(v?.quantity_on_hand || 0) - Number(v?.quantity_reserved || 0);
export const unitCost = v => Number(v?.purchase_cost ?? v?.item?.landed_cost ?? v?.item?.purchase_cost ?? 0);
export const unitPrice = v => Number(v?.sale_price ?? v?.item?.sale_price ?? 0);
export const date = v => { try { return v ? new Date(v).toLocaleDateString('pt-PT') : '—'; } catch { return '—'; } };
export const datetime = v => { try { return v ? new Date(v).toLocaleString('pt-PT',{dateStyle:'short',timeStyle:'short'}) : '—'; } catch { return '—'; } };
export const cleanList = s => String(s||'').split(',').map(x=>x.trim()).filter(Boolean);
export const saleStatusLabel = status => ORDER_STATUS.find(x=>x[0]===status)?.[1] || status || 'Nova';
