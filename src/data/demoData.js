/**
 * demoData.js
 * Dados de exemplo usados enquanto a integração com a API não está pronta.
 */

export const DEMO_QUESTIONS = [
  {
    id: 1,
    type: "open",
    text: "Qual a melhor descrição da diferença entre arrays unidimensionais e multidimensionais?",
  },
  {
    id: 2,
    type: "multiple",
    text: "Em Java, qual modificador de acesso torna um membro acessível somente dentro da própria classe?",
    options: ["public", "protected", "private", "default"],
  },
  {
    id: 3,
    type: "open",
    text: "Explique o conceito de herança em Programação Orientada a Objetos e dê um exemplo.",
  },
  {
    id: 4,
    type: "multiple",
    text: "Qual estrutura de dados segue o princípio LIFO (Last In, First Out)?",
    options: ["Fila (Queue)", "Pilha (Stack)", "Lista ligada", "Árvore binária"],
  },
  {
    id: 5,
    type: "open",
    text: "O que é polimorfismo e como ele pode ser implementado em linguagens orientadas a objetos?",
  },
];

export const HISTORY_DATA = [
  { name: "Atividade 8", professor: "João Ferdinis", disciplina:"Programção 1", criadoem:"08/05/2026", date: "08/10/2026", status: "Concluído" },
  { name: "Atividade 1", professor: "Maria Aparecida", disciplina:"Prog. Orientada a Objetos", criadoem: "23/06/2026", date: "23/11/2026", status: "Concluído" },
  { name: "Prova 4",     professor: "Ana Lima", disciplina: "Sonegação 1", criadoem: "16/02/2026", date: "16/07/2026", status: "Concluído" },
];
