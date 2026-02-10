import { List } from "react-window";

export default function VirtualList({ tasks, render }) {
  return (
    <List
      height={400}
      itemCount={tasks.length}
      itemSize={60}
      width="100%"
      itemData={tasks} 
    >
      {({ index, style, data }) => {
		  
		<div style={style}>
          {render(data[index], index)}
        </div>
        
      }}
    </List>
  );
}
