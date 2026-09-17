import axios from 'axios';

const getApiUrl = () => localStorage.getItem('gas_api_url') || 'https://script.google.com/macros/s/AKfycbyENq-Exf8mFbwermeUGueCOJ7uoEpnp-9N0-lzZptiNvWj2f8ur_uivkefzPJKWd6t/exec';

export const fetchVerbs = async () => {
  const url = getApiUrl();
  if (!url) throw new Error("尚未設定 Google Apps Script API 網址");
  
  // GAS 預設會有 CORS 問題，但只要前端不傳送 custom headers，並使用簡單請求即可。
  // axios GET request is a simple request
  const response = await axios.get(url);
  return response.data;
};

export const addVerb = async (payload) => {
  const url = getApiUrl();
  if (!url) throw new Error("尚未設定 Google Apps Script API 網址");

  const response = await axios.post(url, JSON.stringify({
    action: 'add',
    payload
  }), {
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    }
  });
  
  return response.data;
};

export const saveGameRecord = async (payload) => {
  const url = getApiUrl();
  if (!url) throw new Error("尚未設定 Google Apps Script API 網址");

  const response = await axios.post(url, JSON.stringify({
    action: 'save_record',
    payload
  }), {
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    }
  });
  
  return response.data;
};

export const submitFeedback = async (payload) => {
  const url = getApiUrl();
  if (!url) throw new Error("尚未設定 Google Apps Script API 網址");

  const response = await axios.post(url, JSON.stringify({
    action: 'submit_feedback',
    payload
  }), {
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    }
  });
  
  return response.data;
};
