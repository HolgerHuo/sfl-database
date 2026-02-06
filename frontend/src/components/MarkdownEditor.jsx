import React, { useState, useMemo, useCallback } from 'react';
import SimpleMDE from 'react-simplemde-editor';
import 'easymde/dist/easymde.min.css';

export default function MarkdownEditor({ value, onChange, placeholder = '请输入内容...' }) {
  const options = useMemo(() => ({
    spellChecker: false,
    placeholder,
    status: false,
    toolbar: [
      'bold', 'italic', 'heading', '|',
      'quote', 'unordered-list', 'ordered-list', '|',
      'link', 'image', '|',
      'preview', 'side-by-side', 'fullscreen', '|',
      'guide'
    ],
    minHeight: '200px',
  }), [placeholder]);

  const handleChange = useCallback((value) => {
    onChange(value);
  }, [onChange]);

  return (
    <div className="markdown-editor">
      <SimpleMDE
        value={value}
        onChange={handleChange}
        options={options}
      />
    </div>
  );
}
