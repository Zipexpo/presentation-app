"use client";

import { createList } from "@/lib/action";
import { useForm } from 'react-hook-form';
import {useState} from "react";
import Link from "next/link";

const ListForm = () => {
const { register, formState: {errors,success}, handleSubmit } = useForm();
//   const [state, formAction] = useFormState(createList, undefined);
  const [criteria, setCriteria] = useState([]);
  const updateCriteria = (newCriteria) => {
    setItems((prevCriteria) => [...prevCriteria, newCriteria]);
  };
  const onSubmit = (data) => {
    data.criteria = criteria;
    createList(data);
  };
  return (
    <form className="form" action={handleSubmit(onSubmit)}>
      <input type="text" placeholder="Title" {...register("title",{ required: true})}/>
      <div className="flex items-center w-full gap-1">
        <input className="grow" type="number" placeholder="Duration each presentation" {...register("durationEach")} />
        <span>minutes</span>
      </div>
      <label for="presenDate" className="-mb-2">Present Date</label>
      <input id="presenDate" type="date" placeholder="Present Date" {...register("presenDate")} />
      <label for="groupfile" className="-mb-2">Group info</label>
      <input type="file" id="groupfile" placeholder="Group info" {...register("groupdata")} />
      <label for="criteria" className="-mb-2">Criterias</label>
      <input id="criteria" placeholder="Group info" name="criteria" />
      {errors.title&&<span>Title required!</span>}
      {success &&
        <div className="toast">
          Success save!
        </div>
      }
      <div className="flex justify-between">
        <button className="button button-primary">Save</button>
        <Link href="/list" className="button">Cancel</Link>
      </div>
    </form>
  );
};

export default ListForm;