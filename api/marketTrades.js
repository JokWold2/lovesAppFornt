import {get,post} from '@/utils/request.js'
const root='/api/market-trades'
export const startTradeApi=id=>post(`${root}/items/${id}/conversation`,{}, {silent:true})
export const createTradeIntentApi=(id,data)=>post(`${root}/items/${id}/intent`,data,{silent:true})
export const getTradeConversationsApi=()=>get(`${root}/conversations`,{}, {silent:true})
export const getTradeNoticesApi=()=>get(`${root}/notices`,{}, {silent:true})
export const readTradeNoticeApi=id=>post(`${root}/notices/${id}/read`,{}, {silent:true})
export const getTradeOrdersApi=role=>get(`${root}/orders`,{role},{silent:true})
export const getTradeOrderApi=id=>get(`${root}/orders/${id}`,{}, {silent:true})
export const tradeActionApi=(id,action,data={})=>post(`${root}/orders/${id}/${action}`,data,{silent:true})
export const getTradeMessagesApi=(id,params={})=>get(`${root}/conversations/${id}/messages`,params,{silent:true})
export const sendTradeMessageApi=(id,data)=>post(`${root}/conversations/${id}/messages`,data,{silent:true})
export const readTradeMessagesApi=(id,throughId)=>post(`${root}/conversations/${id}/read`,{throughId},{silent:true})
export const tradeRoute=(mode,id)=>`/pages/market/trade?mode=${mode}${id?'&id='+id:''}`
