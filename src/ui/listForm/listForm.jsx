"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import FormField from "../FormField/FormField";
import { listSchema } from "./listSchema";
import CriteriaField from "../CriteriaField/CriteriaField";

const ListForm = ({ userid }) => {
  const router = useRouter();
  const contentType = "application/json";
  const {
    register,
    formState: { errors, success, isDirty, isValid, isValidating },
    handleSubmit,
    control,
    setError,
  } = useForm({
    mode: "onChange",
    resolver: zodResolver(listSchema, undefined, { rawValues: true }),
  });

  const onSubmit = async (data) => {
    try {
      const res = await fetch("/api/list", {
        method: "POST",
        headers: {
          userid,
          // Accept: contentType,
          // "Content-Type": contentType,
        },
        body: JSON.stringify(data),
      });
      if (res.status !== 201) {
        console.log("Something wrong");
      } else router.push("/list");
    } catch (error) {
      console.log(error);
      console.log("Something wrong");
    }
  };
  const isSubmittable = !!isDirty && !!isValid;
  return (
    <form id="newlist" className="form" onSubmit={handleSubmit(onSubmit)}>
      <FormField
        type="text"
        placeholder="Title"
        name="title"
        title="Title"
        register={register}
        error={errors?.title}
        required={true}
      />
      <FormField
        title="Duration"
        type="number"
        placeholder="Duration each presentation"
        name="durationEach"
        register={register}
        error={errors?.durationEach}
        valueAsNumber
        subfix="minutes"
      />
      <FormField
        type="date"
        placeholder="Present Date"
        name="presenDate"
        title="Present Date"
        register={register}
        required={true}
        error={errors?.presenDate}
      />
      <CriteriaField
        name="criteria"
        title="Criterias"
        register={register}
        control={control}
        error={errors?.criteria}
      />

      <div className="flex justify-between">
        <button
          form="newlist"
          type="submit"
          disabled={!isSubmittable}
          className="btn btn-primary"
        >
          Save
        </button>
        <Link href="/list" className="btn ">
          Cancel
        </Link>
      </div>
    </form>
  );
};

export default ListForm;
