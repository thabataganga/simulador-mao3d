import { useMemo, useState } from "react";
import { buildProfile, makeDims } from "../utils";

export function useAnthropometry() {
  const [sex,        setSex]        = useState("masculino");
  const [percentile, setPercentile] = useState(50);
  const [age,        setAge]        = useState(25);

  const profile = useMemo(() => buildProfile(sex, percentile, age), [sex, percentile, age]);
  const dims    = useMemo(() => makeDims(profile), [profile]);

  return {
    sex, setSex,
    percentile, setPercentile,
    age, setAge,
    profile, dims,
  };
}
