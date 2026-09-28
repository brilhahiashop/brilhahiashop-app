import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://lnezqvonjcvhgaogndqh.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_bm64tpscRoPyieo2qQqpCQ_BNSX-TcC';
export const ADMIN_EMAIL = 'brilhahiashop+admin@gmail.com';
export const SHIPPING_FLAT = 6;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

export const MENU = [
  ['dashboard','⌂','Dashboard'], ['mulher','♀','Mulher'], ['homem','♂','Homem'], ['stock','▦','Todo o stock'],
  ['vendas','€','Vendas'], ['reservas','◷','Reservas'], ['clientes','♙','Clientes'], ['compras','↓','Entradas / Compras'],
  ['fornecedores','◈','Fornecedores'], ['despesas','−','Despesas'], ['envios','➜','Envios'], ['estatisticas','▥','Estatísticas'],
  ['historico','↺','Histórico'], ['definicoes','⚙','Definições'],
];
export const CHANNELS = ['facebook','instagram','tiktok','whatsapp','direto','presencial','outro'];
export const PAYMENTS = ['MB Way','Dinheiro','Transferência','PayPal','Outro'];
export const money = v => `${Number(v || 0).toFixed(2).replace('.', ',')} €`;
export const available = v => Number(v?.quantity_on_hand || 0) - Number(v?.quantity_reserved || 0);
export const date = v => { try { return v ? new Date(v).toLocaleDateString('pt-PT') : '—'; } catch { return '—'; } };
export const datetime = v => { try { return v ? new Date(v).toLocaleString('pt-PT',{dateStyle:'short',timeStyle:'short'}) : '—'; } catch { return '—'; } };
