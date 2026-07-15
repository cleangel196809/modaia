'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import {
  Fab,
  Paper,
  Box,
  Typography,
  TextField,
  IconButton,
  Stack,
  CircularProgress,
} from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import { useSendChatMessageMutation, type ChatbotProductSuggestion } from '@/store/api/apiSlice';

interface ChatEntry {
  role: 'user' | 'bot';
  text: string;
  products?: ChatbotProductSuggestion[];
}

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ChatEntry[]>([
    {
      role: 'bot',
      text: '¡Hola! Soy el asistente de ModaIA Closet 👋 Pregúntame por tallas, pagos, envíos, o busca una prenda.',
    },
  ]);
  const [sendMessage, { isLoading }] = useSendChatMessageMutation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history, open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message) return;
    setHistory((prev) => [...prev, { role: 'user', text: message }]);
    setInput('');
    try {
      const result = await sendMessage({ message }).unwrap();
      setHistory((prev) => [...prev, { role: 'bot', text: result.reply, products: result.products }]);
    } catch {
      setHistory((prev) => [...prev, { role: 'bot', text: 'Tuve un problema respondiendo. Intenta de nuevo.' }]);
    }
  }

  if (!open) {
    return (
      <Fab
        color="primary"
        onClick={() => setOpen(true)}
        sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1300 }}
        aria-label="Abrir chat de ayuda"
      >
        <ChatBubbleOutlineIcon />
      </Fab>
    );
  }

  return (
    <Paper
      elevation={6}
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 340,
        height: 460,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1300,
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ bgcolor: 'primary.main', color: 'white', px: 2, py: 1.5, display: 'flex', alignItems: 'center' }}>
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          Asistente ModaIA
        </Typography>
        <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: 'white' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box ref={scrollRef} sx={{ flexGrow: 1, overflowY: 'auto', p: 1.5, bgcolor: 'grey.50' }}>
        <Stack spacing={1.5}>
          {history.map((entry, i) => (
            <Box key={i} sx={{ display: 'flex', justifyContent: entry.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <Box
                sx={{
                  maxWidth: '85%',
                  bgcolor: entry.role === 'user' ? 'primary.main' : 'white',
                  color: entry.role === 'user' ? 'white' : 'text.primary',
                  px: 1.5,
                  py: 1,
                  borderRadius: 2,
                  boxShadow: entry.role === 'bot' ? 1 : 0,
                }}
              >
                <Typography variant="body2">{entry.text}</Typography>
                {entry.products && entry.products.length > 0 && (
                  <Stack spacing={0.5} sx={{ mt: 1 }}>
                    {entry.products.map((p) => (
                      <Box key={p.id} sx={{ border: '1px solid #eee', borderRadius: 1, p: 0.75 }}>
                        <Typography variant="caption" fontWeight={600} display="block">
                          {p.name} ({p.sku})
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {currencyFormatter.format(p.price)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
            </Box>
          ))}
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
              <CircularProgress size={16} />
            </Box>
          )}
        </Stack>
      </Box>

      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', p: 1, borderTop: '1px solid #eee' }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Escribe tu pregunta..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <IconButton type="submit" color="primary" disabled={isLoading || !input.trim()}>
          <SendIcon fontSize="small" />
        </IconButton>
      </Box>
    </Paper>
  );
}
