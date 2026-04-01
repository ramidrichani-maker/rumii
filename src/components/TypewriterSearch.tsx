import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TypewriterSearchProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

const PLACEHOLDER_WORDS = ['area', 'post code', 'city', 'school', 'university', 'mall'];
const TYPE_SPEED = 80;
const DELETE_SPEED = 50;
const PAUSE_DURATION = 1000;

const TypewriterSearch = ({ value, onChange, className, onFocus, onBlur }: TypewriterSearchProps) => {
  const [placeholder, setPlaceholder] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [charIndex, setCharIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value) return; // Stop animation when user is typing

    const currentWord = PLACEHOLDER_WORDS[wordIndex];

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (charIndex < currentWord.length) {
          setPlaceholder(`Search for ${currentWord.slice(0, charIndex + 1)}`);
          setCharIndex(charIndex + 1);
        } else {
          setTimeout(() => setIsDeleting(true), PAUSE_DURATION);
        }
      } else {
        if (charIndex > 0) {
          setPlaceholder(`Search for ${currentWord.slice(0, charIndex - 1)}`);
          setCharIndex(charIndex - 1);
        } else {
          setIsDeleting(false);
          setWordIndex((wordIndex + 1) % PLACEHOLDER_WORDS.length);
        }
      }
    }, isDeleting ? DELETE_SPEED : TYPE_SPEED);

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, wordIndex, value]);

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || 'Search for area'}
      className={cn(
        'h-14 text-base md:text-lg border-2 border-border/50 bg-background/80 backdrop-blur-sm rounded-xl px-5 focus-visible:ring-primary/30',
        className
      )}
    />
  );
};

export default TypewriterSearch;
