"use client";

import { createList } from "@/lib/action";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import Link from "next/link";
import FormField from "../FormField/FormField";
import { listSchema } from "./listSchema";
import CriteriaField from "../CriteriaField/CriteriaField";

const ListForm = () => {
  const {
    register,
    formState: { errors, success },
    handleSubmit,
    control,
    setError,
  } = useForm({
    mode: "onChange",
    resolver: zodResolver(listSchema, undefined, { rawValues: true }),
  });

  const onSubmit = (data) => {
    data.criteria = criteria;
    createList(data);
  };
  return (
    <form className="form" action={handleSubmit(onSubmit)}>
      <FormField
        type="text"
        placeholder="Title"
        name="title"
        title="Title"
        register={register}
        error={errors.title}
      />
      <FormField
        title="Duration"
        type="number"
        placeholder="Duration each presentation"
        name="durationEach"
        register={register}
        error={errors.durationEach}
        subfix="minutes"
      />
      <FormField
        type="date"
        placeholder="Present Date"
        name="presenDate"
        title="Present Date"
        register={register}
        error={errors.presenDate}
      />
      <CriteriaField
        name="presenDate"
        title="Criterias"
        register={register}
        control={control}
        error={errors?.criteria}
      />
      {errors.title && <span>Title required!</span>}
      {success && <div className="toast">Success save!</div>}
      <div className="flex justify-between">
        <button className="button button-primary">Save</button>
        <Link href="/list" className="button">
          Cancel
        </Link>
      </div>
    </form>
  );
};

export default ListForm;
