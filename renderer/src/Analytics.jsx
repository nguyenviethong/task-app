import React from "react";
import { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable
} from "@hello-pangea/dnd";

export default function Analytics({ tasks, styles }) {
	
  const completed = tasks.filter(t => t.completedAt);

  const late = completed.filter(t =>
    t.completedAt > t.endAt
  );

  const rate = completed.length
    ? Math.round((completed.length - late.length) / completed.length * 100)
    : 0;

  return (
    <div style={styles.card}>
      <h3>📊 Productivity</h3>
      <div>Hoàn thành: {completed.length}</div>
      <div>Trễ hạn: {late.length}</div>
      <div>Đúng hạn: {rate}%</div>
    </div>
  );
  
  
}


