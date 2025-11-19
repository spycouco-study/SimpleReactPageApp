import { useState } from "react";
import "./Card.css";

const Counter = () => {
  const [count, setCount] = useState(0);

  const increment = () => {
    setCount("Click");
    // count = 1;
  };

  const decrement = () => {
    setCount(count - 1);
  };
  return (
    <div class="card">
      <div class="img-wrapper">이미지</div>
      <div>
        <div class="name">여름 쿨 라이트</div>
        <div>
          Lorem ipsum dolor sit amet, consectetur adipisicing elit. Itaque
          perferendis nostrum rerum ducimus assumenda, veniam alias, eligendi,
          distinctio iste maiores placeat mollitia. Atque possimus molestiae
          aspernatur dolore tenetur, illo reprehenderit.
        </div>
      </div>
    </div>
  );
};

export default Counter;
